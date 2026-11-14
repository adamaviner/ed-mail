import { ConvexError, v } from 'convex/values'
import { mutation, query, type QueryCtx } from './_generated/server.js'
import { isEmail } from '../core/text.js'

/** About six months. */
export const DEFAULT_SETTINGS = { retentionDays: 183, digestTo: '', retryMinutes: [1, 5, 25] }

const settingsValidator = v.object({ retentionDays: v.number(), digestTo: v.string(), retryMinutes: v.array(v.number()) })

export async function readSettings(ctx: QueryCtx) {
  const saved = await ctx.db.query('settings').first()
  return {
    retentionDays: saved?.retentionDays ?? DEFAULT_SETTINGS.retentionDays,
    digestTo: saved?.digestTo ?? DEFAULT_SETTINGS.digestTo,
    retryMinutes: saved?.retryMinutes ?? DEFAULT_SETTINGS.retryMinutes,
  }
}

export const get = query({
  args: {},
  returns: settingsValidator,
  handler: async (ctx) => readSettings(ctx),
})

export const update = mutation({
  args: { retentionDays: v.optional(v.number()), digestTo: v.optional(v.string()), retryMinutes: v.optional(v.array(v.number())) },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.retentionDays !== undefined && !(Number.isInteger(args.retentionDays) && args.retentionDays >= 1 && args.retentionDays <= 3650)) {
      throw new ConvexError('Keep emails for a whole number of days, from 1 to 3650.')
    }
    if (args.retryMinutes && (args.retryMinutes.length > 10 || args.retryMinutes.some((m) => !(m > 0 && m <= 24 * 60)))) {
      throw new ConvexError('Retry delays must be up to ten positive numbers of minutes, each at most a day.')
    }
    const digestTo = args.digestTo?.trim()
    if (digestTo && !isEmail(digestTo)) throw new ConvexError('The failure report needs an email address (or nothing, for none).')
    const patch = { ...args, ...(digestTo !== undefined ? { digestTo } : {}) }
    const saved = await ctx.db.query('settings').first()
    if (saved) await ctx.db.patch(saved._id, patch)
    else await ctx.db.insert('settings', patch)
    return null
  },
})
