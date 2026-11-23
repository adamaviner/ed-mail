import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const messageStatus = v.union(v.literal('queued'), v.literal('sending'), v.literal('sent'), v.literal('failed'), v.literal('cancelled'))

/** What an email belongs to in the app, e.g. { type: 'eandaApplication', id }. Ids are strings here: the component can't name the app's tables. */
export const ref = v.object({ type: v.string(), id: v.string() })

/** An app function, as a handle (createFunctionHandle), and what to pass it. */
export const callback = v.object({ handle: v.string(), context: v.optional(v.any()) })

export const fileInfo = v.object({ filename: v.string(), contentType: v.string(), size: v.number() })

export default defineSchema({
  /** One row per sender line that has a Google account connected. A line with no row isn't connected. */
  senders: defineTable({
    key: v.string(),
    account: v.string(),
    refreshTokenEnc: v.string(),
    /** One of the account's Gmail "Send mail as" aliases; none = the account itself. */
    fromEmail: v.optional(v.string()),
    fromName: v.optional(v.string()),
    replyTo: v.optional(v.string()),
    connectedAt: v.number(),
    connectedBy: v.optional(v.string()),
    /** The last failure that was the sender's fault (not an attachment's), cleared by the next success. */
    lastError: v.optional(v.string()),
    lastErrorAt: v.optional(v.number()),
    /** An access token kept between sends (encrypted like the refresh token), until it expires. */
    accessTokenEnc: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    /** The drain that may send for this sender now: one at a time, so sends are paced per account. */
    drainLease: v.optional(v.object({ id: v.string(), until: v.number() })),
    /** When the takeover drain for a crashed one is scheduled (lease.ts). */
    watchdogAt: v.optional(v.number()),
  }).index('by_key', ['key']),

  /** Google sign-ins in progress: the state sent to Google, hashed. */
  oauthStates: defineTable({
    stateHash: v.string(),
    senderKey: v.string(),
    by: v.optional(v.string()),
    expiresAt: v.number(),
  })
    .index('by_stateHash', ['stateHash'])
    .index('by_expiresAt', ['expiresAt']),

  /** One row per email. The body is in `bodies`, so lists never read it. */
  messages: defineTable({
    kind: v.string(),
    senderKey: v.string(),
    to: v.array(v.string()),
    /** The recipients in lower case, for searching the log. */
    toText: v.string(),
    cc: v.optional(v.array(v.string())),
    replyTo: v.optional(v.string()),
    subject: v.string(),
    status: messageStatus,
    attempts: v.number(),
    /** When a queued message is due; while sending, when its claim runs out (a crashed drain). */
    nextAttemptAt: v.number(),
    /** While sending, the lease of the drain that claimed it: only that drain may send it. */
    claimedBy: v.optional(v.string()),
    error: v.optional(v.string()),
    /** Sent, but not quite as asked: e.g. an attachment left off because its link isn't a PDF. */
    warning: v.optional(v.string()),
    ref: v.optional(ref),
    /** A grouping for lists, e.g. the event an email is about. */
    scope: v.optional(v.string()),
    /** Queueing another message with the same chain cancels this one while it is still queued. */
    chain: v.optional(v.string()),
    /** Files the app attaches by name when sending (e.g. 'orientation'). */
    attachments: v.optional(v.array(v.string())),
    /** Files sent as bytes with sendNow: names and sizes only; the bytes aren't kept, so it can't be resent. */
    files: v.optional(v.array(fileInfo)),
    /** Called once, when the outcome is final. */
    onSettled: v.optional(callback),
    /** Asked before each attempt whether the email is still wanted. */
    guard: v.optional(callback),
    by: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    settledAt: v.optional(v.number()),
    /** When a failure went out in the daily digest. */
    reportedAt: v.optional(v.number()),
    resendOf: v.optional(v.id('messages')),
  })
    .index('by_sender_due', ['senderKey', 'status', 'nextAttemptAt'])
    .index('by_ref', ['ref.type', 'ref.id'])
    .index('by_chain', ['chain', 'status'])
    .index('by_scope', ['scope'])
    .index('by_status', ['status'])
    .index('by_sender', ['senderKey'])
    .index('by_kind', ['kind'])
    .index('by_status_reported', ['status', 'reportedAt'])
    .searchIndex('search_to', { searchField: 'toText', filterFields: ['status', 'senderKey', 'kind'] }),

  bodies: defineTable({
    messageId: v.id('messages'),
    html: v.string(),
    text: v.string(),
  }).index('by_message', ['messageId']),

  /** Saved wording, by kind. A kind with no row uses its built-in text from the app's mail config. */
  texts: defineTable({
    key: v.string(),
    subject: v.string(),
    body: v.string(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  }).index('by_key', ['key']),

  /** At most one row. A missing row or field means the default in settings.ts. */
  settings: defineTable({
    retentionDays: v.optional(v.number()),
    digestTo: v.optional(v.string()),
    retryMinutes: v.optional(v.array(v.number())),
  }),
})
