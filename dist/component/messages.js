// The log: every email the app sends, queued, sent, failed or cancelled. Queries that list
// messages never read `bodies`; only `get` with body does, and apps expose that to admins only.
import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { mutation, query } from './_generated/server.js';
import { ensureDrain } from './lease.js';
const drainToSchedule = v.object({ leaseId: v.string(), at: v.number() });
import { callback, fileInfo, messageStatus, ref } from './schema.js';
import { senderDoc } from './senders.js';
export const messageView = v.object({
    id: v.id('messages'),
    kind: v.string(),
    senderKey: v.string(),
    to: v.array(v.string()),
    cc: v.array(v.string()),
    replyTo: v.union(v.string(), v.null()),
    subject: v.string(),
    status: messageStatus,
    attempts: v.number(),
    nextAttemptAt: v.union(v.number(), v.null()),
    error: v.union(v.string(), v.null()),
    warning: v.union(v.string(), v.null()),
    ref: v.union(ref, v.null()),
    scope: v.union(v.string(), v.null()),
    attachments: v.array(v.string()),
    files: v.array(fileInfo),
    by: v.union(v.string(), v.null()),
    createdAt: v.number(),
    sentAt: v.union(v.number(), v.null()),
    settledAt: v.union(v.number(), v.null()),
    resendOf: v.union(v.id('messages'), v.null()),
});
export function view(m) {
    return {
        id: m._id,
        kind: m.kind,
        senderKey: m.senderKey,
        to: m.to,
        cc: m.cc ?? [],
        replyTo: m.replyTo ?? null,
        subject: m.subject,
        status: m.status,
        attempts: m.attempts,
        nextAttemptAt: m.status === 'queued' ? m.nextAttemptAt : null,
        error: m.error ?? null,
        warning: m.warning ?? null,
        ref: m.ref ?? null,
        scope: m.scope ?? null,
        attachments: m.attachments ?? [],
        files: m.files ?? [],
        by: m.by ?? null,
        createdAt: m._creationTime,
        sentAt: m.sentAt ?? null,
        settledAt: m.settledAt ?? null,
        resendOf: m.resendOf ?? null,
    };
}
const newMessage = {
    kind: v.string(),
    senderKey: v.string(),
    /** The sender's title, for the "not connected" error. */
    senderTitle: v.string(),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    replyTo: v.optional(v.string()),
    subject: v.string(),
    html: v.string(),
    text: v.string(),
    ref: v.optional(ref),
    scope: v.optional(v.string()),
    chain: v.optional(v.string()),
    attachments: v.optional(v.array(v.string())),
    onSettled: v.optional(callback),
    guard: v.optional(callback),
    by: v.optional(v.string()),
    now: v.number(),
};
export const notConnected = (title) => `No Google account is connected for ${title}. Connect one in Admin, then retry the failed emails.`;
async function insert(ctx, fields, body) {
    const id = await ctx.db.insert('messages', { ...fields, toText: [...fields.to, ...(fields.cc ?? [])].join(' ').toLowerCase() });
    await ctx.db.insert('bodies', { messageId: id, ...body });
    return id;
}
/** Cancels the still-queued messages of a chain. They aren't settled: the newer message is. */
async function cancelQueued(ctx, chain, now) {
    const queued = await ctx.db
        .query('messages')
        .withIndex('by_chain', (q) => q.eq('chain', chain).eq('status', 'queued'))
        .collect();
    for (const m of queued)
        await ctx.db.patch(m._id, { status: 'cancelled', settledAt: now, error: 'A newer email replaced it.' });
    return queued.length;
}
/**
 * Queues an email. With no sender connected it is written as failed at once, and `settled` comes
 * back for the caller to report (the outcome is final). `drain` is set when the caller must
 * schedule a drain for the sender (with that lease id, at that time).
 */
export const enqueue = mutation({
    args: newMessage,
    returns: v.object({ id: v.id('messages'), drain: v.union(drainToSchedule, v.null()), settled: v.union(v.null(), v.object({ error: v.string(), onSettled: v.union(callback, v.null()) })) }),
    handler: async (ctx, { senderTitle, html, text, now, ...m }) => {
        if (!m.to.length)
            throw new ConvexError('An email needs a recipient.');
        if (m.chain)
            await cancelQueued(ctx, m.chain, now);
        const connected = (await senderDoc(ctx, m.senderKey)) !== null;
        if (!connected) {
            const error = notConnected(senderTitle);
            const id = await insert(ctx, { ...m, status: 'failed', attempts: 0, nextAttemptAt: now, error, settledAt: now }, { html, text });
            return { id, drain: null, settled: { error, onSettled: m.onSettled ?? null } };
        }
        const id = await insert(ctx, { ...m, status: 'queued', attempts: 0, nextAttemptAt: now }, { html, text });
        return { id, drain: await ensureDrain(ctx, m.senderKey, now, now), settled: null };
    },
});
/** Logs an email that sendNow is about to send itself (one attempt, no queue). */
export const start = mutation({
    args: { ...newMessage, files: v.optional(v.array(fileInfo)) },
    returns: v.object({ id: v.id('messages'), error: v.union(v.string(), v.null()) }),
    handler: async (ctx, { senderTitle, html, text, now, ...m }) => {
        if (!m.to.length)
            throw new ConvexError('An email needs a recipient.');
        const connected = (await senderDoc(ctx, m.senderKey)) !== null;
        const error = connected ? null : notConnected(senderTitle);
        const id = await insert(ctx, error ? { ...m, status: 'failed', attempts: 0, nextAttemptAt: now, error, settledAt: now } : { ...m, status: 'sending', attempts: 1, nextAttemptAt: now }, {
            html,
            text,
        });
        return { id, error };
    },
});
/** sendNow's outcome. */
export const finish = mutation({
    args: { id: v.id('messages'), error: v.optional(v.string()), warning: v.optional(v.string()), now: v.number() },
    returns: v.null(),
    handler: async (ctx, { id, error, warning, now }) => {
        await ctx.db.patch(id, error ? { status: 'failed', error: error.slice(0, 1000), settledAt: now } : { status: 'sent', error: undefined, warning: warning?.slice(0, 1000), sentAt: now, settledAt: now });
        return null;
    },
});
export const get = query({
    args: { id: v.id('messages') },
    returns: v.union(messageView, v.null()),
    handler: async (ctx, { id }) => {
        const m = await ctx.db.get(id);
        return m ? view(m) : null;
    },
});
/** One message with its body. Apps expose this to admins only. */
export const getWithBody = query({
    args: { id: v.id('messages') },
    returns: v.union(v.null(), v.object({ message: messageView, html: v.string(), text: v.string() })),
    handler: async (ctx, { id }) => {
        const m = await ctx.db.get(id);
        if (!m)
            return null;
        const body = await ctx.db
            .query('bodies')
            .withIndex('by_message', (q) => q.eq('messageId', id))
            .unique();
        return { message: view(m), html: body?.html ?? '', text: body?.text ?? '' };
    },
});
const filters = { status: v.optional(messageStatus), senderKey: v.optional(v.string()), kind: v.optional(v.string()), scope: v.optional(v.string()) };
/**
 * The log, newest first, a page at a time. One filter picks the index; the rest filter within it,
 * so a page can come back shorter than asked.
 */
export const list = query({
    args: { paginationOpts: paginationOptsValidator, ...filters },
    returns: paginationResultValidator(messageView),
    handler: async (ctx, { paginationOpts, status, senderKey, kind, scope }) => {
        const base = scope
            ? ctx.db.query('messages').withIndex('by_scope', (q) => q.eq('scope', scope))
            : status
                ? ctx.db.query('messages').withIndex('by_status', (q) => q.eq('status', status))
                : senderKey
                    ? ctx.db.query('messages').withIndex('by_sender', (q) => q.eq('senderKey', senderKey))
                    : kind
                        ? ctx.db.query('messages').withIndex('by_kind', (q) => q.eq('kind', kind))
                        : ctx.db.query('messages');
        const page = await base
            .order('desc')
            .filter((q) => q.and(status ? q.eq(q.field('status'), status) : true, senderKey ? q.eq(q.field('senderKey'), senderKey) : true, kind ? q.eq(q.field('kind'), kind) : true))
            .paginate(paginationOpts);
        return { ...page, page: page.page.map(view) };
    },
});
/** Messages to or copied to an address (or part of one), best matches first. */
export const search = query({
    args: { text: v.string(), limit: v.optional(v.number()), status: v.optional(messageStatus), senderKey: v.optional(v.string()), kind: v.optional(v.string()) },
    returns: v.array(messageView),
    handler: async (ctx, { text, limit, status, senderKey, kind }) => {
        const found = await ctx.db
            .query('messages')
            .withSearchIndex('search_to', (q) => {
            let s = q.search('toText', text.toLowerCase());
            if (status)
                s = s.eq('status', status);
            if (senderKey)
                s = s.eq('senderKey', senderKey);
            if (kind)
                s = s.eq('kind', kind);
            return s;
        })
            .take(Math.min(limit ?? 50, 100));
        return found.map(view);
    },
});
/** The latest email about this thing, for a status badge beside it. */
export const statusFor = query({
    args: { ref, kind: v.optional(v.string()) },
    returns: v.union(messageView, v.null()),
    handler: async (ctx, { ref, kind }) => {
        const q = ctx.db
            .query('messages')
            .withIndex('by_ref', (q) => q.eq('ref.type', ref.type).eq('ref.id', ref.id))
            .order('desc');
        const m = kind ? await q.filter((f) => f.eq(f.field('kind'), kind)).first() : await q.first();
        return m ? view(m) : null;
    },
});
export const cancelChain = mutation({
    args: { chain: v.string(), now: v.number() },
    returns: v.number(),
    handler: async (ctx, { chain, now }) => cancelQueued(ctx, chain, now),
});
/** How many emails failed since `since` (counted up to `cap`), for a count on an overview page. */
export const failedSince = query({
    args: { since: v.number(), cap: v.optional(v.number()) },
    returns: v.number(),
    handler: async (ctx, { since, cap }) => {
        const rows = await ctx.db
            .query('messages')
            .withIndex('by_status', (q) => q.eq('status', 'failed').gte('_creationTime', since))
            .take(cap ?? 100);
        return rows.length;
    },
});
/** Queues a failed message again (after its sender was connected or repaired). */
async function requeue(ctx, m, now) {
    await ctx.db.patch(m._id, { status: 'queued', attempts: 0, nextAttemptAt: now, error: undefined, settledAt: undefined, reportedAt: undefined });
}
/** Queues again every email from this sender that failed since `since`. Returns how many, and a drain lease to schedule. */
export const retryFailed = mutation({
    args: { senderKey: v.string(), since: v.number(), now: v.number() },
    returns: v.object({ count: v.number(), drain: v.union(drainToSchedule, v.null()) }),
    handler: async (ctx, { senderKey, since, now }) => {
        if (!(await senderDoc(ctx, senderKey)))
            throw new ConvexError('Connect a Google account for this line first.');
        const failed = await ctx.db
            .query('messages')
            .withIndex('by_status', (q) => q.eq('status', 'failed').gte('_creationTime', since))
            .filter((q) => q.eq(q.field('senderKey'), senderKey))
            .take(500);
        // Emails sent with file bytes can't be sent again: the bytes weren't kept.
        const again = failed.filter((m) => !m.files?.length);
        for (const m of again)
            await requeue(ctx, m, now);
        return { count: again.length, drain: again.length ? await ensureDrain(ctx, senderKey, now, now) : null };
    },
});
/** Queues a copy of a message with its stored body (its own row, so the log keeps both). */
export const resend = mutation({
    args: { id: v.id('messages'), by: v.optional(v.string()), senderTitle: v.string(), now: v.number() },
    returns: v.object({ id: v.id('messages'), drain: v.union(drainToSchedule, v.null()), settled: v.union(v.null(), v.object({ error: v.string(), onSettled: v.union(callback, v.null()) })) }),
    handler: async (ctx, { id, by, senderTitle, now }) => {
        const m = await ctx.db.get(id);
        if (!m)
            throw new ConvexError('That email is no longer in the log.');
        if (m.files?.length)
            throw new ConvexError('This email had files attached that weren’t kept, so it can’t be sent again from here.');
        if (m.status === 'queued' || m.status === 'sending')
            throw new ConvexError('This email is still being sent.');
        const body = await ctx.db
            .query('bodies')
            .withIndex('by_message', (q) => q.eq('messageId', id))
            .unique();
        const copy = {
            kind: m.kind,
            senderKey: m.senderKey,
            to: m.to,
            cc: m.cc,
            replyTo: m.replyTo,
            subject: m.subject,
            ref: m.ref,
            scope: m.scope,
            chain: m.chain,
            attachments: m.attachments,
            onSettled: m.onSettled,
            by,
            resendOf: id,
        };
        const connected = (await senderDoc(ctx, m.senderKey)) !== null;
        const html = body?.html ?? '';
        const text = body?.text ?? '';
        if (!connected) {
            const error = notConnected(senderTitle);
            const newId = await insert(ctx, { ...copy, status: 'failed', attempts: 0, nextAttemptAt: now, error, settledAt: now }, { html, text });
            return { id: newId, drain: null, settled: { error, onSettled: m.onSettled ?? null } };
        }
        if (m.chain)
            await cancelQueued(ctx, m.chain, now);
        const newId = await insert(ctx, { ...copy, status: 'queued', attempts: 0, nextAttemptAt: now }, { html, text });
        return { id: newId, drain: await ensureDrain(ctx, m.senderKey, now, now), settled: null };
    },
});
//# sourceMappingURL=messages.js.map