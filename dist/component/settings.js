import { v } from 'convex/values';
import { mutation, query } from './_generated/server.js';
export const DEFAULT_SETTINGS = { retentionDays: 183, digestTo: '', retryMinutes: [1, 5, 25] };
const settingsValidator = v.object({ retentionDays: v.number(), digestTo: v.string(), retryMinutes: v.array(v.number()) });
async function row(ctx) {
    return await ctx.db.query('settings').first();
}
export const get = query({
    args: {},
    returns: settingsValidator,
    handler: async (ctx) => {
        const saved = await row(ctx);
        return {
            retentionDays: saved?.retentionDays ?? DEFAULT_SETTINGS.retentionDays,
            digestTo: saved?.digestTo ?? DEFAULT_SETTINGS.digestTo,
            retryMinutes: saved?.retryMinutes ?? DEFAULT_SETTINGS.retryMinutes,
        };
    },
});
export const update = mutation({
    args: { retentionDays: v.optional(v.number()), digestTo: v.optional(v.string()), retryMinutes: v.optional(v.array(v.number())) },
    returns: v.null(),
    handler: async (ctx, args) => {
        if (args.retentionDays !== undefined && !(Number.isInteger(args.retentionDays) && args.retentionDays >= 1)) {
            throw new Error('Keep emails for at least one whole day.');
        }
        if (args.retryMinutes?.some((m) => !(m > 0)))
            throw new Error('Retry delays must be positive numbers of minutes.');
        const saved = await row(ctx);
        if (saved)
            await ctx.db.patch(saved._id, args);
        else
            await ctx.db.insert('settings', args);
        return null;
    },
});
//# sourceMappingURL=settings.js.map