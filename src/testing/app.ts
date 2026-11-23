// A small host app for the library's own tests: a mail config, the Mail instance, the worker and
// admin functions an app would export, and app functions for onSettled and guard.
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { defineTestApp } from 'convex-test'
import { defineMailConfig } from '../core/config.js'
import { AttachmentSkipped, Mail, type MailOptions, guardArgs, settledArgs } from '../client/index.js'
import mailTest from '../test.js'

export const config = defineMailConfig({
  senders: { accounts: { title: 'Account emails' }, welcome: { title: 'Emails to registrants' } },
  kinds: {
    'accounts.verify': { sender: 'accounts', title: 'Confirm your email', when: 'On sign-up.' },
    'demo.offer': {
      sender: 'welcome',
      title: 'Offer',
      when: 'When approved.',
      resend: 'rebuild',
      text: {
        builtIn: { subject: 'Your offer, {first_name}', body: '<p>Hi {first_name},</p><p><a href="{link}">Take it</a></p>' },
        placeholders: [
          { key: 'first_name', label: 'First name' },
          { key: 'link', label: 'Link' },
        ],
        required: ['link'],
        sample: { first_name: 'Ana', link: 'https://example.org/x' },
      },
    },
    'demo.info': {
      sender: 'welcome',
      title: 'Form information',
      when: 'Shown on the form.',
      email: false,
      text: { builtIn: { subject: '', body: '<p>Four hours a day.</p>' }, placeholders: [] },
    },
  },
})

export const app = defineTestApp({
  schema: defineSchema({
    outcomes: defineTable({ messageId: v.string(), ok: v.boolean(), error: v.optional(v.string()), context: v.any() }),
    wanted: defineTable({ key: v.string(), yes: v.boolean() }),
  }),
  components: { mail: mailTest },
})

export const slept: number[] = []
const worker = {} as MailOptions<typeof config>['worker']
export const mail: Mail<typeof config> = new Mail(app.components.mail, {
  config,
  google: () => ({ id: 'client-id', secret: 'client-secret' }),
  encryptionSecret: () => 'client-secret',
  siteUrl: () => 'https://example.convex.site/',
  afterConnect: ({ senderKey, error }) => `https://app.example.org/admin/email?${error ? `error=${encodeURIComponent(error)}` : `connected=${senderKey}`}`,
  worker,
  attachments: {
    guide: async () => ({ filename: 'Guide.pdf', contentType: 'application/pdf', data: new Uint8Array([37, 80, 68, 70]) }),
    broken: async () => {
      throw new Error('The guide link is broken.')
    },
    none: async () => null,
    webPage: async () => {
      throw new AttachmentSkipped('The link leads to a web page, not a file.')
    },
  },
  logUrl: () => 'https://app.example.org/admin/email?tab=log',
  sleep: async (ms) => void slept.push(ms),
})

const admin = { name: 'Admin', email: 'admin@example.org' }
const check = async (_ctx: unknown, auth: unknown) => {
  if ((auth as { token?: string })?.token !== 'admin') throw new Error('Not allowed')
  return admin
}
const staffCheck = async (_ctx: unknown, auth: unknown) => {
  const token = (auth as { token?: string })?.token
  if (token !== 'admin' && token !== 'staff') throw new Error('Not allowed')
  return { name: 'Staff' }
}

export const defined = app.defineModules({
  mailWorker: mail.worker(),
  mailAdmin: mail.adminApi({ requireAdmin: check, requireStaff: staffCheck }),
  app: {
    settled: app.internalMutation({ args: settledArgs, handler: async (ctx, args) => void (await ctx.db.insert('outcomes', args)) }),
    stillWanted: app.internalQuery({
      args: guardArgs,
      handler: async (ctx, { context }) => (await ctx.db.query('wanted').collect()).find((w) => w.key === context)?.yes ?? true,
    }),
    outcomes: app.query({ args: {}, handler: async (ctx) => await ctx.db.query('outcomes').collect() }),
    setWanted: app.mutation({ args: { key: v.string(), yes: v.boolean() }, handler: async (ctx, a) => void (await ctx.db.insert('wanted', a)) }),
    /** Queues an offer the way a feature's mutation would. */
    offer: app.mutation({
      args: { to: v.string(), chain: v.optional(v.string()), guardKey: v.optional(v.string()), attachments: v.optional(v.array(v.string())), sender: v.optional(v.string()) },
      handler: async (ctx, a): Promise<string> =>
        await mail.enqueue(ctx, {
          kind: 'demo.offer',
          to: a.to,
          subject: 'Your offer',
          html: '<p>Take it</p>',
          ref: { type: 'application', id: 'app1' },
          chain: a.chain,
          attachments: a.attachments,
          sender: a.sender as 'welcome' | undefined,
          onSettled: { fn: defined.internal.app.settled, context: { app: 'app1' } },
          guard: a.guardKey ? { fn: defined.internal.app.stillWanted, context: a.guardKey } : undefined,
        }),
    }),
    sendNow: app.action({
      args: { to: v.string(), withFile: v.optional(v.boolean()) },
      handler: async (ctx, a): Promise<{ id: string; ok: boolean; error?: string }> =>
        await mail.sendNow(ctx, {
          kind: 'accounts.verify',
          to: a.to,
          subject: 'Invoice',
          text: 'Attached.\n\nThanks',
          files: a.withFile ? [{ filename: 'Invoice.pdf', contentType: 'application/pdf', data: new Uint8Array([1, 2, 3]) }] : undefined,
        }),
    }),
    callback: app.action({
      args: { url: v.string() },
      handler: async (ctx, { url }): Promise<{ status: number; location: string | null } | null> => {
        const res = await mail.handleOAuthCallback(ctx, new Request(url))
        return res ? { status: res.status, location: res.headers.get('location') } : null
      },
    }),
    text: app.query({ args: { kind: v.string() }, handler: async (ctx, { kind }) => await mail.text(ctx, kind as 'demo.offer') }),
    cleanup: app.mutation({ args: {}, handler: async (ctx) => await mail.cleanup(ctx) }),
    digest: app.action({ args: {}, handler: async (ctx): Promise<{ sent: number } | null> => await mail.digest(ctx) }),
    statusFor: app.query({ args: {}, handler: async (ctx) => await mail.statusFor(ctx, { type: 'application', id: 'app1' }) }),
    cancel: app.mutation({ args: { chain: v.string() }, handler: async (ctx, { chain }) => await mail.cancelChain(ctx, chain) }),
  },
})
Object.assign(worker, { drain: defined.internal.mailWorker.drain, revoke: defined.internal.mailWorker.revoke })

export const ADMIN = { token: 'admin' }
export const STAFF = { token: 'staff' }
