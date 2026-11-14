// What an app's convex/ code imports. The app makes one instance (convex/mail.ts):
//
//   export const mail: Mail<typeof mailConfig> = new Mail(components.mail, { config: mailConfig, ... })
//
// (the type annotation breaks the cycle between this file and the worker module that re-exports
// mail.worker()). Everything that needs the app's secrets, its callbacks or the network runs in the
// app's own functions, built here: the component only stores rows.
import { createFunctionHandle, httpActionGeneric, internalActionGeneric } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { textProblem } from '../core/config.js';
import { htmlToText } from '../core/emailHtml.js';
import { GMAIL_SEND_SCOPE, GoogleError, accessToken, authUrl, exchangeCode, gmailSend, revoke } from '../core/google.js';
import { buildMime } from '../core/mime.js';
import { safeHtml } from '../core/safeHtml.js';
import { escapeHtml, isEmail, textToHtml } from '../core/text.js';
import { decryptToken, encryptToken } from '../core/tokenCrypt.js';
import { adminApi } from './admin.js';
export { adminApi };
/** What an app's onSettled mutation receives. Use `settledArgs` as its args. */
export const settledArgs = { messageId: v.string(), ok: v.boolean(), error: v.optional(v.string()), context: v.any() };
/** What an app's guard query receives; it returns whether the email is still wanted. */
export const guardArgs = { messageId: v.string(), context: v.any() };
/** A drain stops and schedules itself again after this long, well inside an action's time limit. */
const DRAIN_BUDGET_MS = 5 * 60_000;
/** How long a Google sign-in may take. */
const STATE_TTL_MS = 15 * 60_000;
/** "Retry failed emails" reaches back this far. */
const RETRY_WINDOW_MS = 7 * 24 * 60 * 60_000;
/** Largest file fetched to attach. */
const MAX_FETCHED_BYTES = 15 * 1024 * 1024;
/** Fetches a file from the web to attach (e.g. a PDF linked from a setting). */
export async function fetchAttachment(url, fallbackName) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`The attachment at ${url} couldn’t be fetched (${res.status}).`);
    const data = new Uint8Array(await res.arrayBuffer());
    if (data.length > MAX_FETCHED_BYTES)
        throw new Error(`The attachment at ${url} is too big to email.`);
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '') || fallbackName;
    return { filename: name, contentType: res.headers.get('content-type')?.split(';')[0] || 'application/octet-stream', data };
}
const errorText = (err) => (err instanceof ConvexError ? String(err.data) : err instanceof Error ? err.message : String(err));
export async function sha256Hex(text) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomState() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
export class Mail {
    component;
    options;
    constructor(component, options) {
        this.component = component;
        this.options = options;
    }
    get config() {
        return this.options.config;
    }
    senderTitle(key) {
        return this.config.senders[key]?.title ?? key;
    }
    kindSpec(kind) {
        const spec = this.config.kinds[kind];
        if (!spec)
            throw new ConvexError(`Unknown mail kind ${kind}.`);
        return spec;
    }
    /** The row fields shared by enqueue and sendNow, checked. */
    async prepare(msg) {
        const spec = this.kindSpec(msg.kind);
        if (spec.email === false)
            throw new ConvexError(`${spec.title} isn’t an email.`);
        const to = (Array.isArray(msg.to) ? msg.to : [msg.to]).map((a) => a.trim()).filter(Boolean);
        const cc = msg.cc?.map((a) => a.trim()).filter(Boolean);
        for (const a of [...to, ...(cc ?? []), ...(msg.replyTo ? [msg.replyTo] : [])])
            if (!isEmail(a))
                throw new ConvexError(`“${a}” isn’t an email address.`);
        if (!to.length)
            throw new ConvexError('An email needs a recipient.');
        if (msg.html === undefined && msg.text === undefined)
            throw new ConvexError('An email needs a body.');
        const html = msg.html ?? textToHtml(msg.text ?? '');
        const text = msg.text ?? htmlToText(html);
        const senderKey = msg.sender ?? spec.sender;
        return {
            kind: msg.kind,
            senderKey,
            senderTitle: this.senderTitle(senderKey),
            to,
            cc: cc?.length ? cc : undefined,
            replyTo: msg.replyTo,
            subject: msg.subject.replace(/\s+/g, ' ').trim(),
            html,
            text,
            ref: msg.ref,
            scope: msg.scope,
            chain: msg.chain,
            attachments: msg.attachments?.length ? msg.attachments : undefined,
            onSettled: msg.onSettled ? { handle: await createFunctionHandle(msg.onSettled.fn), context: msg.onSettled.context } : undefined,
            guard: msg.guard ? { handle: await createFunctionHandle(msg.guard.fn), context: msg.guard.context } : undefined,
            by: msg.by,
            now: Date.now(),
        };
    }
    /**
     * Queues an email from a mutation, in the caller's transaction, and makes sure its sender's drain
     * will run. Returns the message id. With no sender connected the email is logged as failed and
     * onSettled is called at once, in this transaction.
     */
    async enqueue(ctx, msg) {
        const row = await this.prepare(msg);
        const res = await ctx.runMutation(this.component.messages.enqueue, row);
        await this.afterQueued(ctx, row.senderKey, res);
        return res.id;
    }
    /** Schedules the drain a queued email needs, or reports an email that failed at once (no sender connected). */
    async afterQueued(ctx, senderKey, res) {
        if (res.drain)
            await ctx.scheduler.runAt(res.drain.at, this.options.worker.drain, { senderKey, leaseId: res.drain.leaseId });
        if (res.settled?.onSettled)
            await this.callSettled(ctx, [{ id: res.id, onSettled: res.settled.onSettled, error: res.settled.error }]);
    }
    /**
     * Sends one email now, from an action: one attempt, logged, the outcome returned. For test sends,
     * emails with file bytes (which aren't stored, so the log can't resend them), and "send now" buttons.
     */
    async sendNow(ctx, msg) {
        const row = await this.prepare(msg);
        const files = msg.files ?? [];
        const { onSettled: _o, guard: _g, ...logged } = row;
        const started = await ctx.runMutation(this.component.messages.start, { ...logged, files: files.map((f) => ({ filename: f.filename, contentType: f.contentType, size: f.data.length })) });
        if (started.error)
            return { id: started.id, ok: false, error: started.error };
        let error;
        try {
            const creds = await ctx.runQuery(this.component.senders.credentials, { key: row.senderKey });
            if (!creds)
                throw new Error(`No Google account is connected for ${row.senderTitle}.`);
            const named = await this.namedAttachments(ctx, row.attachments ?? [], new Map());
            const token = await this.token(ctx, creds);
            await gmailSend(token, this.mime(creds, row, [...files, ...named]));
            if (creds.lastError)
                await ctx.runMutation(this.component.senders.recordError, { key: row.senderKey, now: Date.now() });
        }
        catch (err) {
            error = this.problem(err, row.senderKey);
            if (err instanceof GoogleError)
                await ctx.runMutation(this.component.senders.recordError, { key: row.senderKey, error, now: Date.now() });
        }
        await ctx.runMutation(this.component.messages.finish, { id: started.id, error, now: Date.now() });
        return error ? { id: started.id, ok: false, error } : { id: started.id, ok: true };
    }
    /** Cancels the still-queued emails of a chain (e.g. an offer that was withdrawn). */
    async cancelChain(ctx, chain) {
        return await ctx.runMutation(this.component.messages.cancelChain, { chain, now: Date.now() });
    }
    /** The latest email about this thing (optionally of one kind), for a status badge. */
    async statusFor(ctx, ref, kind) {
        return await ctx.runQuery(this.component.messages.statusFor, { ref, kind });
    }
    /** Whether email for this sender can go out: Google is set up and an account is connected. */
    async ready(ctx, senderKey) {
        if (!this.options.google())
            return false;
        return (await ctx.runQuery(this.component.senders.address, { key: senderKey })) !== null;
    }
    /** The address a sender sends as (never its token), e.g. where staff notices go. */
    async noticeAddress(ctx, senderKey) {
        return await ctx.runQuery(this.component.senders.address, { key: senderKey });
    }
    /** The wording for a kind: the saved one, else the built-in. */
    async text(ctx, kind) {
        const spec = this.kindSpec(kind).text;
        if (!spec)
            throw new ConvexError(`${this.kindSpec(kind).title} has no wording.`);
        const saved = await ctx.runQuery(this.component.texts.get, { key: kind });
        return saved ? { subject: saved.subject, body: saved.body, custom: true } : { ...spec.builtIn, custom: false };
    }
    /** Saves wording for a kind: cleaned (safeHtml) and checked against the kind's placeholders first. */
    async saveText(ctx, kind, t, by) {
        const spec = this.kindSpec(kind);
        const clean = { subject: spec.email === false ? '' : t.subject.replace(/\s+/g, ' ').trim(), body: safeHtml(t.body.trim()) };
        const problem = textProblem(spec, clean);
        if (problem)
            throw new ConvexError(problem);
        await ctx.runMutation(this.component.texts.save, { key: kind, ...clean, by, now: Date.now() });
    }
    async resetText(ctx, kind) {
        await ctx.runMutation(this.component.texts.reset, { key: kind });
    }
    async settings(ctx) {
        return await ctx.runQuery(this.component.settings.get, {});
    }
    async updateSettings(ctx, patch) {
        await ctx.runMutation(this.component.settings.update, patch);
    }
    /** Deletes what the retention setting no longer keeps, a batch at a time; call again while `more`. For the app's nightly cleanup. */
    async cleanup(ctx) {
        return await ctx.runMutation(this.component.maintenance.cleanup, { now: Date.now() });
    }
    /** Queues again the emails from a sender that failed in the last week (after it was connected or repaired). */
    async retryFailed(ctx, senderKey) {
        const res = await ctx.runMutation(this.component.messages.retryFailed, { senderKey, since: Date.now() - RETRY_WINDOW_MS, now: Date.now() });
        if (res.drain)
            await ctx.scheduler.runAt(res.drain.at, this.options.worker.drain, { senderKey, leaseId: res.drain.leaseId });
        return res.count;
    }
    /** Queues the stored copy of an email again. Only for kinds that resend 'stored'. */
    async resend(ctx, messageId, by) {
        const m = await ctx.runQuery(this.component.messages.get, { id: messageId });
        if (!m)
            throw new ConvexError('That email is no longer in the log.');
        const spec = this.config.kinds[m.kind];
        if (spec?.resend === 'rebuild')
            throw new ConvexError(`${spec.title} is made afresh each time: send it again from where it belongs.`);
        const res = await ctx.runMutation(this.component.messages.resend, { id: messageId, by, senderTitle: this.senderTitle(m.senderKey), now: Date.now() });
        await this.afterQueued(ctx, m.senderKey, res);
        return res.id;
    }
    // ── Sending ──────────────────────────────────────────────────────────────────────────────────
    secret() {
        const s = this.options.encryptionSecret();
        if (!s)
            throw new Error('The secret for Google tokens isn’t set on this deployment.');
        return s;
    }
    googleClient() {
        const c = this.options.google();
        if (!c)
            throw new Error('Google sign-in isn’t set up on this deployment (no OAuth client id and secret).');
        return c;
    }
    /** An access token for the sender: the cached one while it has a minute left, else a fresh one, cached. */
    async token(ctx, creds, fresh = false) {
        if (!fresh && creds.accessTokenEnc && (creds.accessTokenExpiresAt ?? 0) > Date.now() + 60_000)
            return await decryptToken(this.secret(), creds.accessTokenEnc);
        const got = await accessToken(this.googleClient(), await decryptToken(this.secret(), creds.refreshTokenEnc));
        await ctx.runMutation(this.component.senders.cacheToken, { key: creds.key, accessTokenEnc: await encryptToken(this.secret(), got.token), expiresAt: got.expiresAt });
        return got.token;
    }
    mime(creds, m, files) {
        return buildMime({
            from: { email: creds.fromEmail ?? creds.account, name: creds.fromName },
            to: m.to,
            cc: m.cc,
            replyTo: m.replyTo ?? creds.replyTo,
            subject: m.subject,
            html: m.html,
            text: m.text,
            attachments: files,
        });
    }
    problem(err, senderKey) {
        return err instanceof GoogleError ? `Gmail (${this.senderTitle(senderKey)}) didn’t send it: ${err.message}` : errorText(err);
    }
    async namedAttachments(ctx, names, cache) {
        const out = [];
        for (const name of names) {
            if (!cache.has(name)) {
                const resolve = this.options.attachments?.[name];
                if (!resolve)
                    throw new Error(`The app has no attachment called “${name}”.`);
                cache.set(name, await resolve(ctx));
            }
            const file = cache.get(name);
            if (file)
                out.push(file);
        }
        return out;
    }
    async callSettled(ctx, calls) {
        for (const c of calls) {
            try {
                await ctx.runMutation(c.onSettled.handle, { messageId: c.id, ok: !c.error, error: c.error, context: c.onSettled.context ?? null });
            }
            catch (err) {
                console.error(`onSettled for email ${c.id} failed: ${errorText(err)}`);
            }
        }
    }
    /** Sends what is due for one sender, paced, then schedules itself for the next due time or stops. */
    async drain(ctx, senderKey, leaseId) {
        const started = Date.now();
        const title = this.senderTitle(senderKey);
        const files = new Map();
        const pause = this.options.pauseMs ?? 1500;
        const sleep = this.options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
        let creds = null;
        let token = null;
        let cleared = false;
        let sentOne = false;
        while (Date.now() - started < DRAIN_BUDGET_MS) {
            const claim = await ctx.runMutation(this.component.drain.claim, { senderKey, senderTitle: title, leaseId, batch: this.options.batch ?? 20, now: Date.now() });
            if (claim.state === 'notMine')
                return;
            if (claim.state === 'notConnected') {
                await this.callSettled(ctx, claim.settled);
                return;
            }
            if (!claim.messages.length)
                break;
            for (const { message: m, html, text, guard } of claim.messages) {
                if (guard) {
                    let wanted = true;
                    try {
                        wanted = await ctx.runQuery(guard.handle, { messageId: m.id, context: guard.context ?? null });
                    }
                    catch (err) {
                        console.error(`The guard for email ${m.id} failed, so it is sent: ${errorText(err)}`);
                    }
                    if (!wanted) {
                        await ctx.runMutation(this.component.drain.cancel, { id: m.id, now: Date.now() });
                        continue;
                    }
                }
                let attached;
                try {
                    attached = await this.namedAttachments(ctx, m.attachments, files);
                }
                catch (err) {
                    // The file's problem, not the sender's: retried like any failure, and kept off the sender's line.
                    await this.settle(ctx, m.id, `The email wasn’t sent: ${errorText(err)}`);
                    continue;
                }
                if (sentOne && pause)
                    await sleep(pause);
                try {
                    creds ??= await ctx.runQuery(this.component.senders.credentials, { key: senderKey });
                    if (!creds)
                        throw new Error(`No Google account is connected for ${title}.`);
                    const mime = this.mime(creds, { ...m, replyTo: m.replyTo ?? undefined, html, text }, attached);
                    token ??= await this.token(ctx, creds);
                    try {
                        await gmailSend(token, mime);
                    }
                    catch (err) {
                        // A cached token Google stopped taking early: one fresh token, one more try.
                        if (!(err instanceof GoogleError && err.auth))
                            throw err;
                        token = await this.token(ctx, creds, true);
                        await gmailSend(token, mime);
                    }
                    sentOne = true;
                    if (creds.lastError && !cleared) {
                        await ctx.runMutation(this.component.senders.recordError, { key: senderKey, now: Date.now() });
                        cleared = true;
                    }
                    await this.settle(ctx, m.id);
                }
                catch (err) {
                    const problem = this.problem(err, senderKey);
                    if (err instanceof GoogleError && err.auth) {
                        // Retrying can't help until someone signs in again: everything queued for this sender fails now.
                        await this.callSettled(ctx, await ctx.runMutation(this.component.drain.failSender, { senderKey, error: problem, now: Date.now() }));
                        await ctx.runMutation(this.component.drain.release, { senderKey, leaseId, now: Date.now() });
                        return;
                    }
                    await ctx.runMutation(this.component.senders.recordError, { key: senderKey, error: problem, now: Date.now() });
                    await this.settle(ctx, m.id, problem);
                }
            }
        }
        const next = await ctx.runMutation(this.component.drain.release, { senderKey, leaseId, now: Date.now() });
        if (next !== null)
            await ctx.scheduler.runAt(next, this.options.worker.drain, { senderKey, leaseId });
    }
    /** Records one attempt; calls onSettled when that was the last word. */
    async settle(ctx, id, error) {
        const call = await ctx.runMutation(this.component.drain.settle, { id, error, now: Date.now() });
        if (call)
            await this.callSettled(ctx, [call]);
    }
    // ── The daily report ─────────────────────────────────────────────────────────────────────────
    /**
     * Emails the failures nobody was told about yet to the address in the settings (none: nothing),
     * from the digest sender, or any healthy one if that one is broken. Marks them reported once sent.
     */
    async digest(ctx) {
        const { digestTo } = await ctx.runQuery(this.component.settings.get, {});
        if (!digestTo)
            return null;
        const failures = await ctx.runQuery(this.component.maintenance.unreported, { limit: 200 });
        if (!failures.length)
            return null;
        const senders = await ctx.runQuery(this.component.senders.list, {});
        const preferred = senders.find((s) => s.key === this.config.digestSender);
        const sender = preferred && !preferred.lastError ? preferred : (senders.find((s) => !s.lastError && s.key in this.config.senders) ?? preferred);
        if (!sender)
            return null;
        const kindTitle = (k) => this.config.kinds[k]?.title ?? k;
        const when = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
        const rows = failures
            .map((f) => `<tr><td>${escapeHtml(when(f.createdAt))} UTC</td><td>${escapeHtml(kindTitle(f.kind))}</td><td>${escapeHtml(f.to.join(', '))}</td><td>${escapeHtml(f.subject)}</td><td>${escapeHtml(f.error ?? '')}</td></tr>`)
            .join('\n');
        const link = this.options.logUrl?.();
        const html = [
            `<p>${failures.length === 1 ? 'One email' : `${failures.length} emails`} failed since the last report.</p>`,
            '<table cellpadding="4" border="1" style="border-collapse:collapse"><tr><th>When</th><th>Email</th><th>To</th><th>Subject</th><th>Why</th></tr>',
            rows,
            '</table>',
            link ? `<p><a href="${escapeHtml(link)}">See them in the log</a>, where you can send them again.</p>` : '',
        ].join('\n');
        const res = await this.sendNow(ctx, {
            kind: 'mail.digest',
            sender: sender.key,
            to: digestTo,
            subject: `${failures.length} email${failures.length === 1 ? '' : 's'} failed`,
            html,
        });
        if (!res.ok)
            return null;
        await ctx.runMutation(this.component.maintenance.markReported, { ids: failures.map((f) => f.id), now: Date.now() });
        return { sent: failures.length };
    }
    // ── The app's worker functions ───────────────────────────────────────────────────────────────
    /** The internal actions the app exports from convex/mailWorker.ts: `export const { drain, revoke, digest } = mail.worker()`. */
    worker() {
        return {
            drain: internalActionGeneric({
                args: { senderKey: v.string(), leaseId: v.string() },
                returns: v.null(),
                handler: async (ctx, { senderKey, leaseId }) => {
                    await this.drain(ctx, senderKey, leaseId);
                    return null;
                },
            }),
            revoke: internalActionGeneric({
                args: { refreshTokenEnc: v.string() },
                returns: v.null(),
                handler: async (_ctx, { refreshTokenEnc }) => {
                    await revoke(await decryptToken(this.secret(), refreshTokenEnc)).catch(() => { });
                    return null;
                },
            }),
            digest: internalActionGeneric({
                args: {},
                returns: v.null(),
                handler: async (ctx) => {
                    await this.digest(ctx);
                    return null;
                },
            }),
        };
    }
    // ── Google sign-in ───────────────────────────────────────────────────────────────────────────
    redirectUri() {
        return `${this.options.siteUrl().replace(/\/+$/, '')}${this.options.callbackPath ?? '/google/oauth/callback'}`;
    }
    /** Starts a sign-in for one sender line; the browser goes to the URL this returns. */
    async startConnect(ctx, senderKey, by) {
        if (!(senderKey in this.config.senders))
            throw new ConvexError(`Unknown sender ${senderKey}.`);
        const client = this.options.google();
        if (!client)
            throw new ConvexError('Google sign-in isn’t set up on this deployment yet: set the OAuth client id and secret.');
        const state = randomState();
        const loginHint = await ctx.runMutation(this.component.senders.startConnect, { key: senderKey, stateHash: await sha256Hex(state), by, expiresAt: Date.now() + STATE_TTL_MS });
        return { url: authUrl({ clientId: client.id, redirectUri: this.redirectUri(), state, scope: GMAIL_SEND_SCOPE, loginHint: loginHint ?? undefined }) };
    }
    /**
     * Google's redirect back after a sign-in. Returns null when the state isn't one of this
     * library's, so an app with other Google sign-ins on the same path can try its own next.
     */
    async handleOAuthCallback(ctx, request) {
        const url = new URL(request.url);
        const state = url.searchParams.get('state');
        if (!state)
            return null;
        const stateHash = await sha256Hex(state);
        const pending = await ctx.runQuery(this.component.senders.peekState, { stateHash, now: Date.now() });
        if (!pending)
            return null;
        const back = (result) => new Response(null, { status: 302, headers: { Location: this.options.afterConnect(result) } });
        const code = url.searchParams.get('code');
        if (!code)
            return back({ senderKey: pending.senderKey, error: url.searchParams.get('error') === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google didn’t finish the sign-in.' });
        try {
            const got = await exchangeCode({ client: this.googleClient(), redirectUri: this.redirectUri(), code, scope: GMAIL_SEND_SCOPE });
            const done = await ctx.runMutation(this.component.senders.finishConnect, {
                stateHash,
                account: got.email,
                refreshTokenEnc: await encryptToken(this.secret(), got.refreshToken),
                now: Date.now(),
            });
            return done ? back({ senderKey: done.senderKey }) : back({ error: 'The sign-in took too long. Try again.' });
        }
        catch (err) {
            return back({ senderKey: pending.senderKey, error: errorText(err) });
        }
    }
    /** Adds the Google callback to the app's router, when nothing else of the app's uses the same path. */
    registerRoutes(http) {
        http.route({
            path: this.options.callbackPath ?? '/google/oauth/callback',
            method: 'GET',
            handler: httpActionGeneric(async (ctx, request) => (await this.handleOAuthCallback(ctx, request)) ?? new Response('This sign-in link has expired. Start again.', { status: 400 })),
        });
    }
    /** The admin queries and mutations, each behind the app's own checks: `export const { ... } = mail.adminApi({...})` in convex/mailAdmin.ts. */
    adminApi(o) {
        return adminApi(this, o);
    }
}
//# sourceMappingURL=index.js.map