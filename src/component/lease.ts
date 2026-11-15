// One drain per sender at a time, so one account's sends are paced and its access token is fetched
// once. The lease on the sender row says which drain may send: a running one keeps extending it, a
// scheduled one holds it until a little after it is due. Messages for a sender with no row aren't
// drained at all (they fail when queued; see messages.enqueue).
import type { Id } from './_generated/dataModel.js'
import type { MutationCtx } from './_generated/server.js'
import { senderDoc } from './senders.js'

/** How long a drain may go without extending its lease before another may take over. */
export const LEASE_MS = 3 * 60_000

export type DrainToSchedule = { leaseId: string; at: number }

/**
 * Makes sure a drain will run for this sender by `dueAt`. Returns the drain the caller must
 * schedule, or null when one is already running or scheduled early enough.
 *
 * A running drain could crash while holding the lease. So when a message waits behind a live lease,
 * a takeover drain is scheduled for when that lease runs out (once per lease end): if the drain is
 * still alive by then, it has extended its lease and the takeover finds it isn't its turn and stops.
 */
export async function ensureDrain(ctx: MutationCtx, senderKey: string, dueAt: number, now: number): Promise<DrainToSchedule | null> {
  const sender = await senderDoc(ctx, senderKey)
  if (!sender) return null
  const lease = sender.drainLease
  const at = Math.max(dueAt, now)
  if (lease && lease.until > now && lease.until - LEASE_MS <= at) {
    if ((sender.watchdogAt ?? 0) >= lease.until) return null
    await ctx.db.patch(sender._id, { watchdogAt: lease.until })
    return { leaseId: crypto.randomUUID(), at: lease.until + 1000 }
  }
  return { leaseId: await takeLease(ctx, sender._id, at), at }
}

/** A new lease for a drain to be scheduled at `at`; an older scheduled drain finds it isn't its own and stops. */
export async function takeLease(ctx: MutationCtx, senderId: Id<'senders'>, at: number): Promise<string> {
  const id = crypto.randomUUID()
  await ctx.db.patch(senderId, { drainLease: { id, until: at + LEASE_MS } })
  return id
}
