// Saved wording, by kind. The built-in wording and the checks live in the app's mail config, which
// the component can't see: the client checks and cleans a text (Mail.saveText) before saving it here.
import { v } from 'convex/values';
import { mutation, query } from './_generated/server.js';
const textDoc = (ctx, key) => ctx.db
    .query('texts')
    .withIndex('by_key', (q) => q.eq('key', key))
    .unique();
const textView = v.object({ key: v.string(), subject: v.string(), body: v.string(), updatedAt: v.number(), updatedBy: v.union(v.string(), v.null()) });
export const get = query({
    args: { key: v.string() },
    returns: v.union(textView, v.null()),
    handler: async (ctx, { key }) => {
        const t = await textDoc(ctx, key);
        return t ? { key: t.key, subject: t.subject, body: t.body, updatedAt: t.updatedAt, updatedBy: t.updatedBy ?? null } : null;
    },
});
/** Every saved text (one row per kind an admin changed: a few dozen at most). */
export const list = query({
    args: {},
    returns: v.array(textView),
    handler: async (ctx) => (await ctx.db.query('texts').collect()).map((t) => ({ key: t.key, subject: t.subject, body: t.body, updatedAt: t.updatedAt, updatedBy: t.updatedBy ?? null })),
});
export const save = mutation({
    args: { key: v.string(), subject: v.string(), body: v.string(), by: v.optional(v.string()), now: v.number() },
    returns: v.null(),
    handler: async (ctx, { key, subject, body, by, now }) => {
        const doc = { subject, body, updatedAt: now, updatedBy: by };
        const existing = await textDoc(ctx, key);
        if (existing)
            await ctx.db.patch(existing._id, doc);
        else
            await ctx.db.insert('texts', { key, ...doc });
        return null;
    },
});
/** Back to the built-in wording. */
export const reset = mutation({
    args: { key: v.string() },
    returns: v.null(),
    handler: async (ctx, { key }) => {
        const existing = await textDoc(ctx, key);
        if (existing)
            await ctx.db.delete(existing._id);
        return null;
    },
});
//# sourceMappingURL=texts.js.map