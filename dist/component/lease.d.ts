import type { Id } from './_generated/dataModel.js';
import type { MutationCtx } from './_generated/server.js';
/** How long a drain may go without extending its lease before another may take over. */
export declare const LEASE_MS: number;
export type DrainToSchedule = {
    leaseId: string;
    at: number;
};
/**
 * Makes sure a drain will run for this sender by `dueAt`. Returns the drain the caller must
 * schedule, or null when one is already running or scheduled early enough.
 *
 * A running drain could crash while holding the lease. So when a message waits behind a live lease,
 * a takeover drain is scheduled for when that lease runs out (once per lease end): if the drain is
 * still alive by then, it has extended its lease and the takeover finds it isn't its turn and stops.
 */
export declare function ensureDrain(ctx: MutationCtx, senderKey: string, dueAt: number, now: number): Promise<DrainToSchedule | null>;
/** A new lease for a drain to be scheduled at `at`; an older scheduled drain finds it isn't its own and stops. */
export declare function takeLease(ctx: MutationCtx, senderId: Id<'senders'>, at: number): Promise<string>;
//# sourceMappingURL=lease.d.ts.map