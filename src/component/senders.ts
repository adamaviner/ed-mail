// Sender lines: which Google account sends for each sender key. The refresh token never leaves the
// server: `list` returns rows through shown(), and only `credentials` (for the app's worker, which
// apps must not expose) includes it.
import { ConvexError, v } from 'convex/values'
import type { Doc } from './_generated/dataModel.js'
import { mutation, query, type QueryCtx } from './_generated/server.js'
import { isEmail } from '../core/text.js'

export const senderDoc = (ctx: QueryCtx, key: string) =>
  ctx.db
    .query('senders')
    .withIndex('by_key', (q) => q.eq('key', key))
    .unique()

export const senderView = v.object({
  key: v.string(),
  account: v.string(),
  fromEmail: v.union(v.string(), v.null()),
  fromName: v.union(v.string(), v.null()),
  replyTo: v.union(v.string(), v.null()),
  connectedAt: v.number(),
  connectedBy: v.union(v.string(), v.null()),
  lastError: v.union(v.string(), v.null()),
  lastErrorAt: v.union(v.number(), v.null()),
})

/** What anyone outside the worker may see of a sender: everything but the tokens. */
export const shown = (s: Doc<'senders'>) => ({
  key: s.key,
  account: s.account,
  fromEmail: s.fromEmail ?? null,
  fromName: s.fromName ?? null,
  replyTo: s.replyTo ?? null,
  connectedAt: s.connectedAt,
  connectedBy: s.connectedBy ?? null,
  lastError: s.lastError ?? null,
  lastErrorAt: s.lastErrorAt ?? null,
})

/** Every connected sender (a handful of rows). */
export const list = query({
  args: {},
  returns: v.array(senderView),
  handler: async (ctx) => (await ctx.db.query('senders').collect()).map(shown),
})

/** The whole row, tokens included: only for the app's worker and sendNow. */
export const credentials = query({
  args: { key: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      key: v.string(),
      account: v.string(),
      refreshTokenEnc: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
      replyTo: v.optional(v.string()),
      lastError: v.optional(v.string()),
      accessTokenEnc: v.optional(v.string()),
      accessTokenExpiresAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, { key }) => {
    const s = await senderDoc(ctx, key)
    if (!s) return null
    return {
      key: s.key,
      account: s.account,
      refreshTokenEnc: s.refreshTokenEnc,
      fromEmail: s.fromEmail,
      fromName: s.fromName,
      replyTo: s.replyTo,
      lastError: s.lastError,
      accessTokenEnc: s.accessTokenEnc,
      accessTokenExpiresAt: s.accessTokenExpiresAt,
    }
  },
})

/** The address a sender sends as, for staff notices (which go to the sending account's own address). */
export const address = query({
  args: { key: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { key }) => {
    const s = await senderDoc(ctx, key)
    return s ? (s.fromEmail ?? s.account) : null
  },
})

/** Starts a Google sign-in for one line. Returns the current account, as Google's login hint. */
export const startConnect = mutation({
  args: { key: v.string(), stateHash: v.string(), by: v.optional(v.string()), expiresAt: v.number() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { key, stateHash, by, expiresAt }) => {
    await ctx.db.insert('oauthStates', { stateHash, senderKey: key, by, expiresAt })
    return (await senderDoc(ctx, key))?.account ?? null
  },
})

/** The line a sign-in belongs to, if the state is this library's and hasn't expired. */
export const peekState = query({
  args: { stateHash: v.string(), now: v.number() },
  returns: v.union(v.null(), v.object({ senderKey: v.string() })),
  handler: async (ctx, { stateHash, now }) => {
    const row = await ctx.db
      .query('oauthStates')
      .withIndex('by_stateHash', (q) => q.eq('stateHash', stateHash))
      .unique()
    return row && row.expiresAt > now ? { senderKey: row.senderKey } : null
  },
})

/** Saves the account Google signed in as, for the line the sign-in started from. */
export const finishConnect = mutation({
  args: { stateHash: v.string(), account: v.string(), refreshTokenEnc: v.string(), now: v.number() },
  returns: v.union(v.null(), v.object({ senderKey: v.string() })),
  handler: async (ctx, { stateHash, account, refreshTokenEnc, now }) => {
    const state = await ctx.db
      .query('oauthStates')
      .withIndex('by_stateHash', (q) => q.eq('stateHash', stateHash))
      .unique()
    if (!state || state.expiresAt <= now) return null
    await ctx.db.delete(state._id)
    const key = state.senderKey
    const existing = await senderDoc(ctx, key)
    const row = {
      account,
      refreshTokenEnc,
      connectedAt: now,
      connectedBy: state.by,
      lastError: undefined,
      lastErrorAt: undefined,
      accessTokenEnc: undefined,
      accessTokenExpiresAt: undefined,
    }
    if (existing) {
      // A different account can't send as the old one's aliases.
      await ctx.db.patch(existing._id, existing.account === account ? row : { ...row, fromEmail: undefined })
    } else {
      await ctx.db.insert('senders', { key, ...row })
    }
    return { senderKey: key }
  },
})

/** Copies a sender as it is, token included: for an app moving its existing sign-ins into the library. */
export const importSender = mutation({
  args: {
    key: v.string(),
    account: v.string(),
    refreshTokenEnc: v.string(),
    fromEmail: v.optional(v.string()),
    fromName: v.optional(v.string()),
    replyTo: v.optional(v.string()),
    connectedAt: v.number(),
    connectedBy: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await senderDoc(ctx, args.key)
    if (existing) await ctx.db.replace(existing._id, args)
    else await ctx.db.insert('senders', args)
    return null
  },
})

export const update = mutation({
  args: { key: v.string(), fromEmail: v.string(), fromName: v.string(), replyTo: v.string() },
  returns: v.null(),
  handler: async (ctx, { key, ...fields }) => {
    const row = await senderDoc(ctx, key)
    if (!row) throw new ConvexError('Sign in to Google on this line first.')
    const fromEmail = fields.fromEmail.trim().toLowerCase()
    const replyTo = fields.replyTo.trim()
    if (fromEmail && !isEmail(fromEmail)) throw new ConvexError('“Send as” must be an email address.')
    if (replyTo && !isEmail(replyTo)) throw new ConvexError('“Replies go to” must be an email address.')
    await ctx.db.patch(row._id, {
      fromEmail: fromEmail && fromEmail !== row.account ? fromEmail : undefined,
      fromName: fields.fromName.trim().slice(0, 100) || undefined,
      replyTo: replyTo || undefined,
    })
    return null
  },
})

/**
 * Disconnects a line. Returns its refresh token when no other line still sends as the same account,
 * so the app can revoke it (unless something of its own, like a read-only inbox, uses the account).
 */
export const disconnect = mutation({
  args: { key: v.string() },
  returns: v.union(v.null(), v.object({ account: v.string(), refreshTokenEnc: v.union(v.string(), v.null()) })),
  handler: async (ctx, { key }) => {
    const row = await senderDoc(ctx, key)
    if (!row) return null
    await ctx.db.delete(row._id)
    const others = (await ctx.db.query('senders').collect()).some((r) => r.account === row.account)
    return { account: row.account, refreshTokenEnc: others ? null : row.refreshTokenEnc }
  },
})

/** Keeps the line's last failure (cleared with no error), for Admin. */
export const recordError = mutation({
  args: { key: v.string(), error: v.optional(v.string()), now: v.number() },
  returns: v.null(),
  handler: async (ctx, { key, error, now }) => {
    const row = await senderDoc(ctx, key)
    if (!row || row.lastError === error) return null
    await ctx.db.patch(row._id, { lastError: error?.slice(0, 500), lastErrorAt: error ? now : undefined })
    return null
  },
})

/** Keeps an access token for later sends from this line, until it expires. */
export const cacheToken = mutation({
  args: { key: v.string(), accessTokenEnc: v.string(), expiresAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { key, accessTokenEnc, expiresAt }) => {
    const row = await senderDoc(ctx, key)
    if (row) await ctx.db.patch(row._id, { accessTokenEnc, accessTokenExpiresAt: expiresAt })
    return null
  },
})
