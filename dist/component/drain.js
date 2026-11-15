// The component's side of a drain. The drain itself is an action in the app (client/worker.ts), since
// sending needs the app's secrets and its callbacks; these mutations hand it work and record results.
import { v } from 'convex/values';
import { mutation } from './_generated/server.js';
import { LEASE_MS } from './lease.js';
import { callback } from './schema.js';
import { notConnected, view, messageView } from './messages.js';
import { senderDoc } from './senders.js';
import { readSettings } from './settings.js';
const settledCall = v.object({ id: v.id('messages'), onSettled: callback, error: v.optional(v.string()) });
const claimed = v.object({
    message: messageView,
    html: v.string(),
    text: v.string(),
    guard: v.union(callback, v.null()),
});
/**
 * Takes the sender's lease (if it is this drain's, or free, or run out) and claims the next due
 * messages, oldest first, marking them sending until the lease would run out. A claim that a crashed
 * drain left behind comes due again then, so very rarely one email goes out twice; that is accepted
 * over losing it.
 */
export const claim = mutation({
    args: { senderKey: v.string(), senderTitle: v.string(), leaseId: v.string(), batch: v.number(), now: v.number() },
    returns: v.union(v.object({ state: v.literal('notMine') }), v.object({ state: v.literal('notConnected'), settled: v.array(settledCall) }), v.object({ state: v.literal('claimed'), messages: v.array(claimed) })),
    handler: async (ctx, { senderKey, senderTitle, leaseId, batch, now }) => {
        const sender = await senderDoc(ctx, senderKey);
        if (!sender) {
            // Disconnected after these were queued.
            return { state: 'notConnected', settled: await failAll(ctx, senderKey, notConnected(senderTitle), now) };
        }
        const lease = sender.drainLease;
        if (lease && lease.id !== leaseId && lease.until > now)
            return { state: 'notMine' };
        const until = now + LEASE_MS;
        await ctx.db.patch(sender._id, { drainLease: { id: leaseId, until } });
        const due = [...(await dueOf(ctx, senderKey, 'sending', now, batch)), ...(await dueOf(ctx, senderKey, 'queued', now, batch))].slice(0, batch);
        const out = [];
        for (const m of due) {
            await ctx.db.patch(m._id, { status: 'sending', attempts: m.attempts + 1, nextAttemptAt: until });
            const body = await ctx.db
                .query('bodies')
                .withIndex('by_message', (q) => q.eq('messageId', m._id))
                .unique();
            out.push({ message: view({ ...m, status: 'sending', attempts: m.attempts + 1 }), html: body?.html ?? '', text: body?.text ?? '', guard: m.guard ?? null });
        }
        return { state: 'claimed', messages: out };
    },
});
const dueOf = (ctx, senderKey, status, now, n) => ctx.db
    .query('messages')
    .withIndex('by_sender_due', (q) => q.eq('senderKey', senderKey).eq('status', status).lte('nextAttemptAt', now))
    .take(n);
/** Fails every queued or sending message of a sender at once. Returns the callbacks to make. */
async function failAll(ctx, senderKey, error, now) {
    const settled = [];
    for (const status of ['queued', 'sending']) {
        const rows = await ctx.db
            .query('messages')
            .withIndex('by_sender_due', (q) => q.eq('senderKey', senderKey).eq('status', status))
            .take(500);
        for (const m of rows) {
            await ctx.db.patch(m._id, { status: 'failed', error, settledAt: now });
            if (m.onSettled)
                settled.push({ id: m._id, onSettled: m.onSettled, error });
        }
    }
    return settled;
}
/**
 * Records one attempt. A failure is retried after the settings' retry minutes; after the last retry
 * it is final. `onSettled` comes back only when the outcome is final, never between retries.
 */
export const settle = mutation({
    args: { id: v.id('messages'), error: v.optional(v.string()), now: v.number() },
    returns: v.union(v.null(), settledCall),
    handler: async (ctx, { id, error, now }) => {
        const m = await ctx.db.get(id);
        if (!m || m.status !== 'sending')
            return null;
        if (!error) {
            await ctx.db.patch(id, { status: 'sent', error: undefined, sentAt: now, settledAt: now });
            return m.onSettled ? { id, onSettled: m.onSettled } : null;
        }
        const { retryMinutes } = await readSettings(ctx);
        const wait = retryMinutes[m.attempts - 1];
        if (wait !== undefined) {
            await ctx.db.patch(id, { status: 'queued', error: error.slice(0, 1000), nextAttemptAt: now + wait * 60_000 });
            return null;
        }
        await ctx.db.patch(id, { status: 'failed', error: error.slice(0, 1000), settledAt: now });
        return m.onSettled ? { id, onSettled: m.onSettled, error } : null;
    },
});
/** The guard said the email isn't wanted any more (the thing it was about changed). Not settled: nothing went out or failed. */
export const cancel = mutation({
    args: { id: v.id('messages'), now: v.number() },
    returns: v.null(),
    handler: async (ctx, { id, now }) => {
        const m = await ctx.db.get(id);
        if (m && m.status === 'sending')
            await ctx.db.patch(id, { status: 'cancelled', error: 'No longer needed when it was due.', settledAt: now });
        return null;
    },
});
/**
 * The sender's sign-in stopped working: retrying can't help until someone signs in again, so every
 * queued message for it fails now, and the line shows why.
 */
export const failSender = mutation({
    args: { senderKey: v.string(), error: v.string(), now: v.number() },
    returns: v.array(settledCall),
    handler: async (ctx, { senderKey, error, now }) => {
        const sender = await senderDoc(ctx, senderKey);
        if (sender)
            await ctx.db.patch(sender._id, { lastError: error.slice(0, 500), lastErrorAt: now, accessTokenEnc: undefined, accessTokenExpiresAt: undefined });
        return await failAll(ctx, senderKey, error, now);
    },
});
/**
 * The drain is done for now. Returns when it should run again (the next due message, kept under the
 * same lease) or null, releasing the lease. A mutation, so a message queued meanwhile is either seen
 * here or sees no lease and schedules its own drain.
 */
export const release = mutation({
    args: { senderKey: v.string(), leaseId: v.string(), now: v.number() },
    returns: v.union(v.number(), v.null()),
    handler: async (ctx, { senderKey, leaseId, now }) => {
        const sender = await senderDoc(ctx, senderKey);
        if (!sender || sender.drainLease?.id !== leaseId)
            return null;
        const next = (s) => ctx.db
            .query('messages')
            .withIndex('by_sender_due', (q) => q.eq('senderKey', senderKey).eq('status', s))
            .first();
        const times = [await next('queued'), await next('sending')].filter((m) => m !== null).map((m) => m.nextAttemptAt);
        if (!times.length) {
            await ctx.db.patch(sender._id, { drainLease: undefined });
            return null;
        }
        const at = Math.max(Math.min(...times), now);
        await ctx.db.patch(sender._id, { drainLease: { id: leaseId, until: at + LEASE_MS } });
        return at;
    },
});
//# sourceMappingURL=drain.js.map