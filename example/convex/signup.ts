import { v } from 'convex/values'
import { mutation } from './_generated/server.js'
import { mail } from './mail.js'

export const welcome = mutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, { email, name }): Promise<string> => {
    const t = await mail.text(ctx, 'accounts.welcome')
    return await mail.enqueue(ctx, { kind: 'accounts.welcome', to: email, subject: t.subject.replace('{name}', name), html: t.body.replace('{name}', name) })
  },
})
