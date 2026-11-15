// The public queries and mutations the React package calls, each behind the app's own permission
// check. The library knows nothing about how an app logs people in: every function takes an opaque
// `auth` argument (ed-schedule passes { token }) and hands it to the app's check, which returns who
// it is or throws.
import { mutationGeneric, paginationOptsValidator, queryGeneric, type GenericDataModel, type GenericMutationCtx, type GenericQueryCtx } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import type { MailConfig } from '../core/config.js'
import type { Mail } from './index.js'

export interface Who {
  /** For the log and "Saved by". */
  name?: string
  /** Where "Send test to me" goes. */
  email?: string
}

export interface AdminApiOptions {
  /** Throws unless `auth` is an admin's: senders, settings, wording, bodies, resending. */
  requireAdmin: (ctx: GenericQueryCtx<GenericDataModel>, auth: unknown) => Promise<Who>
  /** Throws unless `auth` may see the log without bodies. */
  requireStaff: (ctx: GenericQueryCtx<GenericDataModel>, auth: unknown) => Promise<Who>
  /** Whether something else of the app still uses this Google account, so disconnecting must not revoke its grant. */
  keepGrant?: (ctx: GenericMutationCtx<GenericDataModel>, account: string) => Promise<boolean>
}

const WEEK_MS = 7 * 24 * 60 * 60_000
const status = v.union(v.literal('queued'), v.literal('sending'), v.literal('sent'), v.literal('failed'), v.literal('cancelled'))

export function adminApi<C extends MailConfig>(mail: Mail<C>, o: AdminApiOptions) {
  const c = mail.component
  const auth = v.any()
  const kinds = mail.config.kinds as Record<string, { text?: { builtIn: { subject: string; body: string } } }>

  return {
    /** The sender lines: whether Google is set up, the redirect address to register, and each line's account. */
    senders: queryGeneric({
      args: { auth },
      handler: async (ctx, a) => {
        await o.requireAdmin(ctx, a.auth)
        const rows = await ctx.runQuery(c.senders.list, {})
        return {
          googleReady: mail.options.google() !== null,
          redirectUri: mail.redirectUri(),
          senders: Object.entries(mail.config.senders as Record<string, { title: string }>).map(([key, s]) => ({ key, title: s.title, sender: rows.find((r) => r.key === key) ?? null })),
        }
      },
    }),

    startConnect: mutationGeneric({
      args: { auth, senderKey: v.string() },
      handler: async (ctx, a) => {
        const who = await o.requireAdmin(ctx, a.auth)
        return await mail.startConnect(ctx, a.senderKey, who.name)
      },
    }),

    updateSender: mutationGeneric({
      args: { auth, senderKey: v.string(), fromEmail: v.string(), fromName: v.string(), replyTo: v.string() },
      handler: async (ctx, { auth, senderKey, ...fields }) => {
        await o.requireAdmin(ctx, auth)
        await ctx.runMutation(c.senders.update, { key: senderKey, ...fields })
      },
    }),

    /** Disconnects a line; revokes the Google grant unless another line or the app still uses that account. */
    disconnect: mutationGeneric({
      args: { auth, senderKey: v.string() },
      handler: async (ctx, a) => {
        await o.requireAdmin(ctx, a.auth)
        const gone = await ctx.runMutation(c.senders.disconnect, { key: a.senderKey })
        if (gone?.refreshTokenEnc && !(await o.keepGrant?.(ctx, gone.account))) {
          await ctx.scheduler.runAfter(0, mail.options.worker.revoke, { refreshTokenEnc: gone.refreshTokenEnc })
        }
      },
    }),

    /**
     * Queues a test from one line to the admin pressing the button: a short note, or with `letter`
     * the letter editor's preview as it would arrive. Returns the message id, to watch in the log.
     */
    sendTest: mutationGeneric({
      args: { auth, senderKey: v.string(), letter: v.optional(v.object({ subject: v.string(), html: v.string() })) },
      handler: async (ctx, a) => {
        const who = await o.requireAdmin(ctx, a.auth)
        if (!who.email) throw new ConvexError('Your login has no email address to send the test to.')
        const title = mail.senderTitle(a.senderKey)
        // The letter is the editor's preview, frame and all, so safeHtml (which would drop the frame) isn't applied; it only goes to the admin's own address.
        const content = a.letter
          ? { subject: `Test: ${a.letter.subject || title}`, html: a.letter.html }
          : { subject: `Test email: ${title}`, text: `This is a test from ${title}. If you’re reading it, this line can send.` }
        return await mail.enqueue(ctx, { kind: 'mail.test', sender: a.senderKey, to: who.email, ...content, by: who.name } as Parameters<typeof mail.enqueue>[1])
      },
    }),

    /** Queues again what this line failed to send in the last week. */
    retryFailed: mutationGeneric({
      args: { auth, senderKey: v.string() },
      handler: async (ctx, a) => {
        await o.requireAdmin(ctx, a.auth)
        return await mail.retryFailed(ctx, a.senderKey as never)
      },
    }),

    /** The log, newest first, without bodies (staff may see it). */
    messages: queryGeneric({
      args: { auth, paginationOpts: paginationOptsValidator, status: v.optional(status), senderKey: v.optional(v.string()), kind: v.optional(v.string()), scope: v.optional(v.string()) },
      handler: async (ctx, { auth, ...args }) => {
        await o.requireStaff(ctx, auth)
        return await ctx.runQuery(c.messages.list, args)
      },
    }),

    /** The log searched by recipient, without bodies. */
    searchMessages: queryGeneric({
      args: { auth, text: v.string(), status: v.optional(status), senderKey: v.optional(v.string()), kind: v.optional(v.string()) },
      handler: async (ctx, { auth, ...args }) => {
        await o.requireStaff(ctx, auth)
        return args.text.trim() ? await ctx.runQuery(c.messages.search, { ...args, text: args.text.trim() }) : []
      },
    }),

    /** One email with its body: admins only. */
    message: queryGeneric({
      args: { auth, id: v.string() },
      handler: async (ctx, a) => {
        await o.requireAdmin(ctx, a.auth)
        return await ctx.runQuery(c.messages.getWithBody, { id: a.id })
      },
    }),

    /** Sends the stored copy again (kinds that resend 'stored'). */
    resend: mutationGeneric({
      args: { auth, id: v.string() },
      handler: async (ctx, a) => {
        const who = await o.requireAdmin(ctx, a.auth)
        return await mail.resend(ctx, a.id, who.name)
      },
    }),

    /** How many emails failed in the last week (up to 100), for an overview page. */
    failureCount: queryGeneric({
      args: { auth },
      handler: async (ctx, a) => {
        await o.requireStaff(ctx, a.auth)
        return await ctx.runQuery(c.messages.failedSince, { since: Date.now() - WEEK_MS })
      },
    }),

    settings: queryGeneric({
      args: { auth },
      handler: async (ctx, a) => {
        await o.requireAdmin(ctx, a.auth)
        return await mail.settings(ctx)
      },
    }),

    updateSettings: mutationGeneric({
      args: { auth, retentionDays: v.optional(v.number()), digestTo: v.optional(v.string()) },
      handler: async (ctx, { auth, ...patch }) => {
        await o.requireAdmin(ctx, auth)
        await mail.updateSettings(ctx, patch)
      },
    }),

    /** Every editable kind's wording: saved or built-in, with the built-in beside it. */
    texts: queryGeneric({
      args: { auth },
      handler: async (ctx, a) => {
        await o.requireAdmin(ctx, a.auth)
        const saved = await ctx.runQuery(c.texts.list, {})
        return Object.entries(kinds)
          .filter(([, k]) => k.text)
          .map(([kind, k]) => {
            const row = saved.find((t) => t.key === kind)
            const builtIn = k.text!.builtIn
            return { kind, subject: row?.subject ?? builtIn.subject, body: row?.body ?? builtIn.body, custom: !!row, updatedAt: row?.updatedAt ?? null, updatedBy: row?.updatedBy ?? null, builtIn }
          })
      },
    }),

    /** Saves the wording and returns it as stored (cleaned), for the editor to show. */
    saveText: mutationGeneric({
      args: { auth, kind: v.string(), subject: v.string(), body: v.string() },
      handler: async (ctx, a) => {
        const who = await o.requireAdmin(ctx, a.auth)
        return await mail.saveText(ctx, a.kind as never, { subject: a.subject, body: a.body }, who.name)
      },
    }),

    resetText: mutationGeneric({
      args: { auth, kind: v.string() },
      handler: async (ctx, a) => {
        await o.requireAdmin(ctx, a.auth)
        await mail.resetText(ctx, a.kind as never)
      },
    }),
  }
}
