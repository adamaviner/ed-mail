import { senderDoc } from './senders.js';
/** How long a drain may go without extending its lease before another may take over. */
export const LEASE_MS = 3 * 60_000;
/**
 * Makes sure a drain will run for this sender by `dueAt`. Returns the drain the caller must
 * schedule, or null when one is already running or scheduled early enough.
 *
 * A running drain could crash while holding the lease. So when a message waits behind a live lease,
 * a takeover drain is scheduled for when that lease runs out (once per lease end): if the drain is
 * still alive by then, it has extended its lease and the takeover finds it isn't its turn and stops.
 */
export async function ensureDrain(ctx, senderKey, dueAt, now) {
    const sender = await senderDoc(ctx, senderKey);
    if (!sender)
        return null;
    const lease = sender.drainLease;
    const at = Math.max(dueAt, now);
    if (lease && lease.until > now && lease.until - LEASE_MS <= at) {
        if ((sender.watchdogAt ?? 0) >= lease.until)
            return null;
        await ctx.db.patch(sender._id, { watchdogAt: lease.until });
        return { leaseId: crypto.randomUUID(), at: lease.until + 1000 };
    }
    return { leaseId: await takeLease(ctx, sender._id, at), at };
}
/** A new lease for a drain to be scheduled at `at`; an older scheduled drain finds it isn't its own and stops. */
export async function takeLease(ctx, senderId, at) {
    const id = crypto.randomUUID();
    await ctx.db.patch(senderId, { drainLease: { id, until: at + LEASE_MS } });
    return id;
}
//# sourceMappingURL=lease.js.map