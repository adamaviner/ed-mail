// Keeping the log small (cleanup by the retention setting) and the daily report of failures.
import { v } from 'convex/values';
import { mutation, query } from './_generated/server.js';
import { messageView, view } from './messages.js';
import { readSettings } from './settings.js';
const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Deletes messages (and their bodies) older than the retention setting, a batch at a time, and
 * sign-ins that were never finished. Queued and sending messages are kept whatever their age.
 * `more` says there is more to delete: call again.
 */
export const cleanup = mutation({
    args: { now: v.number(), batch: v.optional(v.number()) },
    returns: v.object({ deleted: v.number(), more: v.boolean() }),
    handler: async (ctx, { now, batch = 200 }) => {
        const { retentionDays } = await readSettings(ctx);
        const old = await ctx.db
            .query('messages')
            .withIndex('by_creation_time', (q) => q.lt('_creationTime', now - retentionDays * DAY_MS))
            .take(batch);
        let deleted = 0;
        for (const m of old) {
            if (m.status === 'queued' || m.status === 'sending')
                continue;
            const body = await ctx.db
                .query('bodies')
                .withIndex('by_message', (q) => q.eq('messageId', m._id))
                .unique();
            if (body)
                await ctx.db.delete(body._id);
            await ctx.db.delete(m._id);
            deleted++;
        }
        const states = await ctx.db
            .query('oauthStates')
            .withIndex('by_expiresAt', (q) => q.lt('expiresAt', now))
            .take(batch);
        for (const s of states)
            await ctx.db.delete(s._id);
        return { deleted, more: old.length === batch || states.length === batch };
    },
});
/** Failures not yet reported, oldest first. The report's own failures are left out, so it never reports itself. */
export const unreported = query({
    args: { limit: v.optional(v.number()) },
    returns: v.array(messageView),
    handler: async (ctx, { limit = 200 }) => {
        const rows = await ctx.db
            .query('messages')
            .withIndex('by_status_reported', (q) => q.eq('status', 'failed').eq('reportedAt', undefined))
            .filter((q) => q.neq(q.field('kind'), 'mail.digest'))
            .take(limit);
        return rows.map(view);
    },
});
export const markReported = mutation({
    args: { ids: v.array(v.id('messages')), now: v.number() },
    returns: v.null(),
    handler: async (ctx, { ids, now }) => {
        for (const id of ids) {
            const m = await ctx.db.get(id);
            if (m?.status === 'failed')
                await ctx.db.patch(id, { reportedAt: now });
        }
        return null;
    },
});
//# sourceMappingURL=maintenance.js.map