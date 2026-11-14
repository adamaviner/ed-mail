import { createFunctionHandle, defineSchema, defineTable, type FunctionHandle } from 'convex/server'
import { v } from 'convex/values'
import { defineTestApp } from 'convex-test'
import { describe, expect, test } from 'vitest'
import mailTest from '../test.js'
import { Mail } from './index.js'

// A host app the size of a test: what an app's convex/ folder would hold, without generated files.
const app = defineTestApp({
  schema: defineSchema({ notes: defineTable({ text: v.string() }), handles: defineTable({ handle: v.string() }) }),
  components: { mail: mailTest },
})
const mail = new Mail(app.components.mail)

const { api, internal, createTest } = app.defineModules({
  app: {
    settings: app.query({ args: {}, handler: async (ctx) => await mail.settings(ctx) }),
    setDigest: app.mutation({
      args: { to: v.string(), fail: v.boolean() },
      handler: async (ctx, args) => {
        await ctx.db.insert('notes', { text: 'app write' })
        await mail.updateSettings(ctx, { digestTo: args.to })
        if (args.fail) throw new Error('after both writes')
      },
    }),
    notes: app.query({ args: {}, handler: async (ctx) => (await ctx.db.query('notes').collect()).map((n) => n.text) }),
    // The shape onSettled will have: an app mutation hands the library a handle to its own function,
    // and the app's worker action calls it later.
    saveHandle: app.mutation({
      args: {},
      handler: async (ctx) => {
        const handle: string = await createFunctionHandle(internal.app.settled)
        await ctx.db.insert('handles', { handle })
      },
    }),
    settled: app.internalMutation({ args: { text: v.string() }, handler: async (ctx, args) => void (await ctx.db.insert('notes', args)) }),
    firstHandle: app.internalQuery({ args: {}, handler: async (ctx) => (await ctx.db.query('handles').first())?.handle ?? null }),
    worker: app.action({
      args: {},
      handler: async (ctx): Promise<void> => {
        const handle = (await ctx.runQuery(internal.app.firstHandle, {})) as FunctionHandle<'mutation', { text: string }> | null
        if (!handle) throw new Error('no handle saved')
        await ctx.runMutation(handle, { text: 'called through a handle' })
      },
    }),
  },
})

describe('Mail client', () => {
  test('settings have defaults and save through the component', async () => {
    const t = createTest()
    expect(await t.query(api.app.settings, {})).toEqual({ retentionDays: 183, digestTo: '', retryMinutes: [1, 5, 25] })
    await t.mutation(api.app.setDigest, { to: 'office@example.org', fail: false })
    expect((await t.query(api.app.settings, {})).digestTo).toBe('office@example.org')
    expect(await t.query(api.app.notes, {})).toEqual(['app write'])
  })

  test("a component write is part of the calling mutation's transaction", async () => {
    const t = createTest()
    await expect(t.mutation(api.app.setDigest, { to: 'office@example.org', fail: true })).rejects.toThrow('after both writes')
    expect((await t.query(api.app.settings, {})).digestTo).toBe('')
    expect(await t.query(api.app.notes, {})).toEqual([])
  })

  test('the component rejects bad settings', async () => {
    const t = createTest()
    await expect(t.mutation(app.components.mail.settings.update, { retentionDays: 0 })).rejects.toThrow('at least one whole day')
  })

  test('a function handle made in a mutation can be called later from an action', async () => {
    const t = createTest()
    await t.mutation(api.app.saveHandle, {})
    await t.action(api.app.worker, {})
    expect(await t.query(api.app.notes, {})).toEqual(['called through a handle'])
  })
})
