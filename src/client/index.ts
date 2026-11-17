// What an app's convex/ code imports. The app makes one instance (convex/mail.ts):
//
//   export const mail: Mail<typeof mailConfig> = new Mail(components.mail, { config: mailConfig, ... })
//
// (the type annotation breaks the cycle between this file and the worker module that re-exports
// mail.worker()). Everything that needs the app's secrets, its callbacks or the network runs in the
// app's own functions, built here: the component only stores rows.
import { createFunctionHandle, httpActionGeneric, internalActionGeneric, type FunctionHandle, type FunctionReference, type HttpRouter } from 'convex/server'
import { ConvexError, v, type Infer } from 'convex/values'
import type { FunctionArgs, FunctionReturnType, Scheduler } from 'convex/server'
import type { ComponentApi } from '../component/_generated/component.js'
import { type BuiltInKind, type MailConfig, textProblem } from '../core/config.js'
import { emailShell, htmlToText } from '../core/emailHtml.js'
import { GMAIL_SEND_SCOPE, GoogleError, type GoogleClient, accessToken, authUrl, exchangeCode, gmailSend, revoke } from '../core/google.js'
import { type MimeAttachment, buildMime } from '../core/mime.js'
import { safeHtml } from '../core/safeHtml.js'
import { escapeHtml, isEmail, textToHtml } from '../core/text.js'
import { decryptToken, encryptToken } from '../core/tokenCrypt.js'
import { adminApi, type AdminApiOptions } from './admin.js'

export type { ComponentApi }
export { adminApi }
export type { AdminApiOptions }

// The smallest ctx each method needs, typed so query, mutation and action ctxs all fit.
type RunQuery = <Q extends FunctionReference<'query', 'public' | 'internal'>>(query: Q, args: FunctionArgs<Q>) => Promise<FunctionReturnType<Q>>
type RunMutation = <M extends FunctionReference<'mutation', 'public' | 'internal'>>(mutation: M, args: FunctionArgs<M>) => Promise<FunctionReturnType<M>>
export type RunQueryCtx = { runQuery: RunQuery }
export type RunMutationCtx = { runQuery: RunQuery; runMutation: RunMutation }
export type EnqueueCtx = RunMutationCtx & { scheduler: Scheduler }
export type RunActionCtx = EnqueueCtx

export type SenderOf<C> = C extends MailConfig<infer S, string> ? S : never
export type KindOf<C> = C extends MailConfig<string, infer K> ? K | BuiltInKind : never

/** What an app's onSettled mutation receives. Use `settledArgs` as its args. */
export const settledArgs = { messageId: v.string(), ok: v.boolean(), error: v.optional(v.string()), context: v.any() }
export type Settled = Infer<ReturnType<typeof v.object<typeof settledArgs>>>
/** What an app's guard query receives; it returns whether the email is still wanted. */
export const guardArgs = { messageId: v.string(), context: v.any() }

export type SettledRef = FunctionReference<'mutation', 'internal', Settled>
export type GuardRef = FunctionReference<'query', 'internal', { messageId: string; context: unknown }, boolean>

export interface OutgoingMessage<C extends MailConfig> {
  kind: KindOf<C>
  to: string | string[]
  cc?: string[]
  replyTo?: string
  subject: string
  /** At least one of html and text; the other is made from it. */
  html?: string
  text?: string
  /** Defaults to the kind's sender. */
  sender?: SenderOf<C>
  /** What the email is about in the app, for the badge beside it and the log's link. */
  ref?: { type: string; id: string }
  scope?: string
  /** Queueing with the same chain cancels an older one still queued, so a resend during retries sends once. */
  chain?: string
  /** Named files (MailOptions.attachments), fetched when sending. */
  attachments?: string[]
  /** Called once with the final outcome: sent, or failed after the retries. */
  onSettled?: { fn: SettledRef; context?: unknown }
  /** Asked before each attempt whether the email is still wanted; if not, it is cancelled quietly. */
  guard?: { fn: GuardRef; context?: unknown }
  /** Who caused it, for the log. */
  by?: string
}

export interface MailOptions<C extends MailConfig> {
  config: C
  /** The Google OAuth client, read from the app's environment when called; null when not set up. */
  google: () => GoogleClient | null
  /** The secret Google tokens are encrypted with (ed-schedule: GOOGLE_CLIENT_SECRET). */
  encryptionSecret: () => string | undefined
  /** The deployment's HTTP actions URL (process.env.CONVEX_SITE_URL), for Google's redirect. */
  siteUrl: () => string
  /** Where Google sends people back to on the app's HTTP router. Register it in Google Cloud. */
  callbackPath?: string
  /** Where the browser goes after a sign-in: the app's page for senders. */
  afterConnect: (result: { senderKey?: string; error?: string }) => string
  /** The app's worker (convex/mailWorker.ts re-exporting mail.worker()), for scheduling it. */
  worker: {
    drain: FunctionReference<'action', 'internal', { senderKey: string; leaseId: string }, null>
    revoke: FunctionReference<'action', 'internal', { refreshTokenEnc: string }, null>
  }
  /** Named attachments: the file to attach, or null to send without it. Fetched once per drain. */
  attachments?: Record<string, (ctx: RunQueryCtx) => Promise<MimeAttachment | null>>
  /** A link to the log, for the failure report. */
  logUrl?: () => string | undefined
  /** Pause between two sends from one account. Gmail allows roughly 150 a minute. */
  pauseMs?: number
  /** For tests: how to wait. */
  sleep?: (ms: number) => Promise<void>
  /** Messages a drain claims at a time. */
  batch?: number
}

type Queued = { id: string; drain: { leaseId: string; at: number } | null; settled: { error: string; onSettled: { handle: string; context?: unknown } | null } | null }

/** A drain stops and schedules itself again after this long, well inside an action's time limit. */
const DRAIN_BUDGET_MS = 5 * 60_000
/** How long a Google sign-in may take. */
const STATE_TTL_MS = 15 * 60_000
/** "Retry failed emails" reaches back this far. */
const RETRY_WINDOW_MS = 7 * 24 * 60 * 60_000
/** Largest file fetched to attach. */
const MAX_FETCHED_BYTES = 15 * 1024 * 1024

interface Credentials {
  key: string
  account: string
  refreshTokenEnc: string
  fromEmail?: string
  fromName?: string
  replyTo?: string
  lastError?: string
  accessTokenEnc?: string
  accessTokenExpiresAt?: number
}

/** Fetches a file from the web to attach (e.g. a PDF linked from a setting). */
export async function fetchAttachment(url: string, fallbackName: string): Promise<MimeAttachment> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`The attachment at ${url} couldn’t be fetched (${res.status}).`)
  const data = new Uint8Array(await res.arrayBuffer())
  if (data.length > MAX_FETCHED_BYTES) throw new Error(`The attachment at ${url} is too big to email.`)
  const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '') || fallbackName
  return { filename: name, contentType: res.headers.get('content-type')?.split(';')[0] || 'application/octet-stream', data }
}

const errorText = (err: unknown) => (err instanceof ConvexError ? String(err.data) : err instanceof Error ? err.message : String(err))

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export class Mail<C extends MailConfig> {
  constructor(
    public readonly component: ComponentApi,
    public readonly options: MailOptions<C>,
  ) {}

  get config(): C {
    return this.options.config
  }

  senderTitle(key: string): string {
    return (this.config.senders as Record<string, { title: string }>)[key]?.title ?? key
  }

  private kindSpec(kind: string) {
    const spec = (this.config.kinds as Record<string, C['kinds'][keyof C['kinds']]>)[kind]
    if (!spec) throw new ConvexError(`Unknown mail kind ${kind}.`)
    return spec
  }

  /** The row fields shared by enqueue and sendNow, checked. */
  private async prepare(msg: OutgoingMessage<C>) {
    const spec = this.kindSpec(msg.kind)
    if (spec.email === false) throw new ConvexError(`${spec.title} isn’t an email.`)
    const to = (Array.isArray(msg.to) ? msg.to : [msg.to]).map((a) => a.trim()).filter(Boolean)
    const cc = msg.cc?.map((a) => a.trim()).filter(Boolean)
    for (const a of [...to, ...(cc ?? []), ...(msg.replyTo ? [msg.replyTo] : [])]) if (!isEmail(a)) throw new ConvexError(`“${a}” isn’t an email address.`)
    if (!to.length) throw new ConvexError('An email needs a recipient.')
    if (msg.html === undefined && msg.text === undefined) throw new ConvexError('An email needs a body.')
    // A text-only email gets the same frame as the rest; the plain text comes from the body, not the frame.
    const html = msg.html ?? emailShell(textToHtml(msg.text ?? ''))
    const text = msg.text ?? htmlToText(msg.html ?? '')
    const senderKey: string = msg.sender ?? spec.sender
    return {
      kind: msg.kind as string,
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
    }
  }

  /**
   * Queues an email from a mutation, in the caller's transaction, and makes sure its sender's drain
   * will run. Returns the message id. With no sender connected the email is logged as failed and
   * onSettled is called at once, in this transaction.
   */
  async enqueue(ctx: EnqueueCtx, msg: OutgoingMessage<C>): Promise<string> {
    const row = await this.prepare(msg)
    const res = await ctx.runMutation(this.component.messages.enqueue, row)
    await this.afterQueued(ctx, row.senderKey, res)
    return res.id
  }

  /** Schedules the drain a queued email needs, or reports an email that failed at once (no sender connected). */
  private async afterQueued(ctx: EnqueueCtx, senderKey: string, res: Queued) {
    if (res.drain) await ctx.scheduler.runAt(res.drain.at, this.options.worker.drain, { senderKey, leaseId: res.drain.leaseId })
    if (res.settled?.onSettled) await this.callSettled(ctx, [{ id: res.id, onSettled: res.settled.onSettled, error: res.settled.error }])
  }

  /**
   * Sends one email now, from an action: one attempt, logged, the outcome returned. For test sends,
   * emails with file bytes (which aren't stored, so the log can't resend them), and "send now" buttons.
   */
  async sendNow(
    ctx: RunActionCtx,
    msg: Omit<OutgoingMessage<C>, 'onSettled' | 'guard' | 'chain'> & { files?: MimeAttachment[] },
  ): Promise<{ id: string; ok: true } | { id: string; ok: false; error: string }> {
    const row = await this.prepare(msg)
    const files = msg.files ?? []
    const { onSettled: _o, guard: _g, ...logged } = row
    const started = await ctx.runMutation(this.component.messages.start, { ...logged, files: files.map((f) => ({ filename: f.filename, contentType: f.contentType, size: f.data.length })) })
    if (started.error) return { id: started.id, ok: false, error: started.error }
    let error: string | undefined
    try {
      const creds = await ctx.runQuery(this.component.senders.credentials, { key: row.senderKey })
      if (!creds) throw new Error(`No Google account is connected for ${row.senderTitle}.`)
      const named = await this.namedAttachments(ctx, row.attachments ?? [], new Map())
      const token = await this.token(ctx, creds)
      await gmailSend(token, this.mime(creds, row, [...files, ...named]))
      if (creds.lastError) await ctx.runMutation(this.component.senders.recordError, { key: row.senderKey, now: Date.now() })
    } catch (err) {
      error = this.problem(err, row.senderKey)
      if (err instanceof GoogleError) await ctx.runMutation(this.component.senders.recordError, { key: row.senderKey, error, now: Date.now() })
    }
    await ctx.runMutation(this.component.messages.finish, { id: started.id, error, now: Date.now() })
    return error ? { id: started.id, ok: false, error } : { id: started.id, ok: true }
  }

  /** Cancels the still-queued emails of a chain (e.g. an offer that was withdrawn). */
  async cancelChain(ctx: RunMutationCtx, chain: string): Promise<number> {
    return await ctx.runMutation(this.component.messages.cancelChain, { chain, now: Date.now() })
  }

  /** The latest email about this thing (optionally of one kind), for a status badge. */
  async statusFor(ctx: RunQueryCtx, ref: { type: string; id: string }, kind?: KindOf<C>) {
    return await ctx.runQuery(this.component.messages.statusFor, { ref, kind })
  }

  /** Whether email for this sender can go out: Google is set up and an account is connected. */
  async ready(ctx: RunQueryCtx, senderKey: SenderOf<C>): Promise<boolean> {
    if (!this.options.google()) return false
    return (await ctx.runQuery(this.component.senders.address, { key: senderKey })) !== null
  }

  /** The address a sender sends as (never its token), e.g. where staff notices go. */
  async noticeAddress(ctx: RunQueryCtx, senderKey: SenderOf<C>): Promise<string | null> {
    return await ctx.runQuery(this.component.senders.address, { key: senderKey })
  }

  /** The wording for a kind: the saved one, else the built-in. */
  async text(ctx: RunQueryCtx, kind: KindOf<C>): Promise<{ subject: string; body: string; custom: boolean }> {
    const spec = this.kindSpec(kind).text
    if (!spec) throw new ConvexError(`${this.kindSpec(kind).title} has no wording.`)
    const saved = await ctx.runQuery(this.component.texts.get, { key: kind })
    return saved ? { subject: saved.subject, body: saved.body, custom: true } : { ...spec.builtIn, custom: false }
  }

  /** Saves wording for a kind: cleaned (safeHtml) and checked against the kind's placeholders first. Returns it as stored. */
  async saveText(ctx: RunMutationCtx, kind: KindOf<C>, t: { subject: string; body: string }, by?: string): Promise<{ subject: string; body: string }> {
    const spec = this.kindSpec(kind)
    const clean = { subject: spec.email === false ? '' : t.subject.replace(/\s+/g, ' ').trim(), body: safeHtml(t.body.trim()) }
    const problem = textProblem(spec, clean)
    if (problem) throw new ConvexError(problem)
    await ctx.runMutation(this.component.texts.save, { key: kind, ...clean, by, now: Date.now() })
    return clean
  }

  async resetText(ctx: RunMutationCtx, kind: KindOf<C>): Promise<void> {
    await ctx.runMutation(this.component.texts.reset, { key: kind })
  }

  async settings(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.settings.get, {})
  }

  async updateSettings(ctx: RunMutationCtx, patch: { retentionDays?: number; digestTo?: string; retryMinutes?: number[] }): Promise<void> {
    await ctx.runMutation(this.component.settings.update, patch)
  }

  /** Deletes what the retention setting no longer keeps, a batch at a time; call again while `more`. For the app's nightly cleanup. */
  async cleanup(ctx: RunMutationCtx): Promise<{ deleted: number; more: boolean }> {
    return await ctx.runMutation(this.component.maintenance.cleanup, { now: Date.now() })
  }

  /** Queues again the emails from a sender that failed in the last week (after it was connected or repaired). */
  async retryFailed(ctx: EnqueueCtx, senderKey: SenderOf<C>): Promise<number> {
    const res = await ctx.runMutation(this.component.messages.retryFailed, { senderKey, since: Date.now() - RETRY_WINDOW_MS, now: Date.now() })
    if (res.drain) await ctx.scheduler.runAt(res.drain.at, this.options.worker.drain, { senderKey, leaseId: res.drain.leaseId })
    return res.count
  }

  /** Queues the stored copy of an email again. Only for kinds that resend 'stored'. */
  async resend(ctx: EnqueueCtx, messageId: string, by?: string): Promise<string> {
    const m = await ctx.runQuery(this.component.messages.get, { id: messageId })
    if (!m) throw new ConvexError('That email is no longer in the log.')
    const spec = (this.config.kinds as Record<string, { resend?: string; title: string }>)[m.kind]
    if (spec?.resend === 'rebuild') throw new ConvexError(`${spec.title} is made afresh each time: send it again from where it belongs.`)
    const res = await ctx.runMutation(this.component.messages.resend, { id: messageId, by, senderTitle: this.senderTitle(m.senderKey), now: Date.now() })
    await this.afterQueued(ctx, m.senderKey, res)
    return res.id
  }

  // ── Sending ──────────────────────────────────────────────────────────────────────────────────

  private secret(): string {
    const s = this.options.encryptionSecret()
    if (!s) throw new Error('The secret for Google tokens isn’t set on this deployment.')
    return s
  }

  private googleClient(): GoogleClient {
    const c = this.options.google()
    if (!c) throw new Error('Google sign-in isn’t set up on this deployment (no OAuth client id and secret).')
    return c
  }

  /** An access token for the sender: the cached one while it has a minute left, else a fresh one, cached. */
  private async token(ctx: RunActionCtx, creds: Credentials, fresh = false): Promise<string> {
    if (!fresh && creds.accessTokenEnc && (creds.accessTokenExpiresAt ?? 0) > Date.now() + 60_000) return await decryptToken(this.secret(), creds.accessTokenEnc)
    const got = await accessToken(this.googleClient(), await decryptToken(this.secret(), creds.refreshTokenEnc))
    await ctx.runMutation(this.component.senders.cacheToken, { key: creds.key, accessTokenEnc: await encryptToken(this.secret(), got.token), expiresAt: got.expiresAt })
    return got.token
  }

  private mime(creds: Credentials, m: { to: string[]; cc?: string[]; replyTo?: string; subject: string; html: string; text: string }, files: MimeAttachment[]) {
    return buildMime({
      from: { email: creds.fromEmail ?? creds.account, name: creds.fromName },
      to: m.to,
      cc: m.cc,
      replyTo: m.replyTo ?? creds.replyTo,
      subject: m.subject,
      html: m.html,
      text: m.text,
      attachments: files,
    })
  }

  private problem(err: unknown, senderKey: string): string {
    return err instanceof GoogleError ? `Gmail (${this.senderTitle(senderKey)}) didn’t send it: ${err.message}` : errorText(err)
  }

  private async namedAttachments(ctx: RunQueryCtx, names: string[], cache: Map<string, MimeAttachment | null>): Promise<MimeAttachment[]> {
    const out: MimeAttachment[] = []
    for (const name of names) {
      if (!cache.has(name)) {
        const resolve = this.options.attachments?.[name]
        if (!resolve) throw new Error(`The app has no attachment called “${name}”.`)
        cache.set(name, await resolve(ctx))
      }
      const file = cache.get(name)
      if (file) out.push(file)
    }
    return out
  }

  private async callSettled(ctx: RunMutationCtx, calls: { id: string; onSettled: { handle: string; context?: unknown }; error?: string }[]) {
    for (const c of calls) {
      try {
        await ctx.runMutation(c.onSettled.handle as FunctionHandle<'mutation', Settled>, { messageId: c.id, ok: !c.error, error: c.error, context: c.onSettled.context ?? null })
      } catch (err) {
        console.error(`onSettled for email ${c.id} failed: ${errorText(err)}`)
      }
    }
  }

  /** Sends what is due for one sender, paced, then schedules itself for the next due time or stops. */
  async drain(ctx: RunActionCtx, senderKey: string, leaseId: string): Promise<void> {
    const started = Date.now()
    const title = this.senderTitle(senderKey)
    const files = new Map<string, MimeAttachment | null>()
    const pause = this.options.pauseMs ?? 1500
    const sleep = this.options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
    let creds: Credentials | null = null
    let token: string | null = null
    let cleared = false
    let sentOne = false

    while (Date.now() - started < DRAIN_BUDGET_MS) {
      const claim = await ctx.runMutation(this.component.drain.claim, { senderKey, senderTitle: title, leaseId, batch: this.options.batch ?? 20, now: Date.now() })
      if (claim.state === 'notMine') return
      if (claim.state === 'notConnected') {
        await this.callSettled(ctx, claim.settled)
        return
      }
      if (!claim.messages.length) break
      for (const { message: m, html, text, guard } of claim.messages) {
        if (guard) {
          let wanted = true
          try {
            wanted = await ctx.runQuery(guard.handle as FunctionHandle<'query', { messageId: string; context: unknown }, boolean>, { messageId: m.id, context: guard.context ?? null })
          } catch (err) {
            console.error(`The guard for email ${m.id} failed, so it is sent: ${errorText(err)}`)
          }
          if (!wanted) {
            await ctx.runMutation(this.component.drain.cancel, { id: m.id, now: Date.now() })
            continue
          }
        }
        let attached: MimeAttachment[]
        try {
          attached = await this.namedAttachments(ctx, m.attachments, files)
        } catch (err) {
          // The file's problem, not the sender's: retried like any failure, and kept off the sender's line.
          await this.settle(ctx, m.id, `The email wasn’t sent: ${errorText(err)}`)
          continue
        }
        if (sentOne && pause) await sleep(pause)
        // Renews the lease right before the send; a drain that ran past its lease stops here instead of
        // sending what the drain that took over now owns.
        const go = await ctx.runMutation(this.component.drain.begin, { id: m.id, senderKey, leaseId, now: Date.now() })
        if (go === 'lost') return
        if (go === 'skip') continue
        try {
          creds ??= await ctx.runQuery(this.component.senders.credentials, { key: senderKey })
          if (!creds) throw new Error(`No Google account is connected for ${title}.`)
          const mime = this.mime(creds, { ...m, replyTo: m.replyTo ?? undefined, html, text }, attached)
          token ??= await this.token(ctx, creds)
          try {
            await gmailSend(token, mime)
          } catch (err) {
            // A cached token Google stopped taking early: one fresh token, one more try.
            if (!(err instanceof GoogleError && err.auth)) throw err
            token = await this.token(ctx, creds, true)
            await gmailSend(token, mime)
          }
          sentOne = true
          if (creds.lastError && !cleared) {
            await ctx.runMutation(this.component.senders.recordError, { key: senderKey, now: Date.now() })
            cleared = true
          }
          await this.settle(ctx, m.id)
        } catch (err) {
          const problem = this.problem(err, senderKey)
          if (err instanceof GoogleError && err.auth) {
            // Retrying can't help until someone signs in again: everything queued for this sender fails now.
            await this.callSettled(ctx, await ctx.runMutation(this.component.drain.failSender, { senderKey, error: problem, now: Date.now() }))
            await ctx.runMutation(this.component.drain.release, { senderKey, leaseId, now: Date.now() })
            return
          }
          await ctx.runMutation(this.component.senders.recordError, { key: senderKey, error: problem, now: Date.now() })
          await this.settle(ctx, m.id, problem)
        }
      }
    }
    const next = await ctx.runMutation(this.component.drain.release, { senderKey, leaseId, now: Date.now() })
    if (next !== null) await ctx.scheduler.runAt(next, this.options.worker.drain, { senderKey, leaseId })
  }

  /** Records one attempt; calls onSettled when that was the last word. */
  private async settle(ctx: RunActionCtx, id: string, error?: string) {
    const call = await ctx.runMutation(this.component.drain.settle, { id, error, now: Date.now() })
    if (call) await this.callSettled(ctx, [call])
  }

  // ── The daily report ─────────────────────────────────────────────────────────────────────────

  /**
   * Emails the failures nobody was told about yet to the address in the settings (none: nothing),
   * from the digest sender, or any healthy one if that one is broken. Marks them reported once sent.
   */
  async digest(ctx: RunActionCtx): Promise<{ sent: number } | null> {
    const { digestTo } = await ctx.runQuery(this.component.settings.get, {})
    if (!digestTo) return null
    const failures = await ctx.runQuery(this.component.maintenance.unreported, { limit: 200 })
    if (!failures.length) return null
    const senders = await ctx.runQuery(this.component.senders.list, {})
    const preferred = senders.find((s) => s.key === this.config.digestSender)
    const sender = preferred && !preferred.lastError ? preferred : (senders.find((s) => !s.lastError && s.key in this.config.senders) ?? preferred)
    if (!sender) return null
    const kindTitle = (k: string) => (this.config.kinds as Record<string, { title: string }>)[k]?.title ?? k
    const when = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
    const rows = failures
      .map(
        (f) =>
          `<tr><td>${escapeHtml(when(f.createdAt))} UTC</td><td>${escapeHtml(kindTitle(f.kind))}</td><td>${escapeHtml(f.to.join(', '))}</td><td>${escapeHtml(f.subject)}</td><td>${escapeHtml(f.error ?? '')}</td></tr>`,
      )
      .join('\n')
    const link = this.options.logUrl?.()
    const html = [
      `<p>${failures.length === 1 ? 'One email' : `${failures.length} emails`} failed since the last report.</p>`,
      '<table cellpadding="4" border="1" style="border-collapse:collapse"><tr><th>When</th><th>Email</th><th>To</th><th>Subject</th><th>Why</th></tr>',
      rows,
      '</table>',
      link ? `<p><a href="${escapeHtml(link)}">See them in the log</a>, where you can send them again.</p>` : '',
    ].join('\n')
    const res = await this.sendNow(ctx, {
      kind: 'mail.digest' as KindOf<C>,
      sender: sender.key as SenderOf<C>,
      to: digestTo,
      subject: `${failures.length} email${failures.length === 1 ? '' : 's'} failed`,
      html,
    })
    if (!res.ok) return null
    await ctx.runMutation(this.component.maintenance.markReported, { ids: failures.map((f) => f.id), now: Date.now() })
    return { sent: failures.length }
  }

  // ── The app's worker functions ───────────────────────────────────────────────────────────────

  /** The internal actions the app exports from convex/mailWorker.ts: `export const { drain, revoke, digest } = mail.worker()`. */
  worker() {
    return {
      drain: internalActionGeneric({
        args: { senderKey: v.string(), leaseId: v.string() },
        returns: v.null(),
        handler: async (ctx, { senderKey, leaseId }): Promise<null> => {
          await this.drain(ctx, senderKey, leaseId)
          return null
        },
      }),
      revoke: internalActionGeneric({
        args: { refreshTokenEnc: v.string() },
        returns: v.null(),
        handler: async (_ctx, { refreshTokenEnc }): Promise<null> => {
          await revoke(await decryptToken(this.secret(), refreshTokenEnc)).catch(() => {})
          return null
        },
      }),
      digest: internalActionGeneric({
        args: {},
        returns: v.null(),
        handler: async (ctx): Promise<null> => {
          await this.digest(ctx)
          return null
        },
      }),
    }
  }

  // ── Google sign-in ───────────────────────────────────────────────────────────────────────────

  redirectUri(): string {
    return `${this.options.siteUrl().replace(/\/+$/, '')}${this.options.callbackPath ?? '/google/oauth/callback'}`
  }

  /** Starts a sign-in for one sender line; the browser goes to the URL this returns. */
  async startConnect(ctx: RunMutationCtx, senderKey: string, by?: string): Promise<{ url: string }> {
    if (!(senderKey in this.config.senders)) throw new ConvexError(`Unknown sender ${senderKey}.`)
    const client = this.options.google()
    if (!client) throw new ConvexError('Google sign-in isn’t set up on this deployment yet: set the OAuth client id and secret.')
    const state = randomState()
    const loginHint = await ctx.runMutation(this.component.senders.startConnect, { key: senderKey, stateHash: await sha256Hex(state), by, expiresAt: Date.now() + STATE_TTL_MS })
    return { url: authUrl({ clientId: client.id, redirectUri: this.redirectUri(), state, scope: GMAIL_SEND_SCOPE, loginHint: loginHint ?? undefined }) }
  }

  /**
   * Google's redirect back after a sign-in. Returns null when the state isn't one of this
   * library's, so an app with other Google sign-ins on the same path can try its own next.
   */
  async handleOAuthCallback(ctx: RunActionCtx, request: Request): Promise<Response | null> {
    const url = new URL(request.url)
    const state = url.searchParams.get('state')
    if (!state) return null
    const stateHash = await sha256Hex(state)
    const pending = await ctx.runQuery(this.component.senders.peekState, { stateHash, now: Date.now() })
    if (!pending) return null
    const back = (result: { senderKey?: string; error?: string }) => new Response(null, { status: 302, headers: { Location: this.options.afterConnect(result) } })
    const code = url.searchParams.get('code')
    if (!code) return back({ senderKey: pending.senderKey, error: url.searchParams.get('error') === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google didn’t finish the sign-in.' })
    try {
      const got = await exchangeCode({ client: this.googleClient(), redirectUri: this.redirectUri(), code, scope: GMAIL_SEND_SCOPE })
      const done = await ctx.runMutation(this.component.senders.finishConnect, {
        stateHash,
        account: got.email,
        refreshTokenEnc: await encryptToken(this.secret(), got.refreshToken),
        now: Date.now(),
      })
      return done ? back({ senderKey: done.senderKey }) : back({ error: 'The sign-in took too long. Try again.' })
    } catch (err) {
      return back({ senderKey: pending.senderKey, error: errorText(err) })
    }
  }

  /** Adds the Google callback to the app's router, when nothing else of the app's uses the same path. */
  registerRoutes(http: HttpRouter) {
    http.route({
      path: this.options.callbackPath ?? '/google/oauth/callback',
      method: 'GET',
      handler: httpActionGeneric(async (ctx, request) => (await this.handleOAuthCallback(ctx, request)) ?? new Response('This sign-in link has expired. Start again.', { status: 400 })),
    })
  }

  /** The admin queries and mutations, each behind the app's own checks: `export const { ... } = mail.adminApi({...})` in convex/mailAdmin.ts. */
  adminApi(o: AdminApiOptions) {
    return adminApi(this, o)
  }
}
