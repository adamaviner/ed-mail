/**
 * Takes the sender's lease (if it is this drain's, or free, or run out) and claims the next due
 * messages, oldest first, marking them sending until the lease would run out. A claim that a crashed
 * drain left behind comes due again then. The drain calls `begin` before each send, which renews the
 * lease and stops a drain that lost it, so an email goes out twice only if one send hangs for longer
 * than the lease; that is accepted over losing it.
 */
export declare const claim: import("convex/server").RegisteredMutation<"public", {
    leaseId: string;
    now: number;
    senderKey: string;
    batch: number;
    senderTitle: string;
}, Promise<{
    state: "notConnected";
    settled: {
        id: import("convex/values").GenericId<"messages">;
        onSettled: {
            context?: any;
            handle: string;
        };
        error: string;
    }[];
    messages?: undefined;
} | {
    state: "notMine";
    settled?: undefined;
    messages?: undefined;
} | {
    state: "claimed";
    messages: {
        message: {
            id: import("convex/values").GenericId<"messages">;
            kind: string;
            senderKey: string;
            to: string[];
            cc: string[];
            replyTo: string | null;
            subject: string;
            status: "queued" | "sending" | "sent" | "failed" | "cancelled";
            attempts: number;
            nextAttemptAt: number | null;
            error: string | null;
            warning: string | null;
            ref: {
                id: string;
                type: string;
            } | null;
            scope: string | null;
            attachments: string[];
            files: {
                filename: string;
                contentType: string;
                size: number;
            }[];
            by: string | null;
            createdAt: number;
            sentAt: number | null;
            settledAt: number | null;
            resendOf: import("convex/values").GenericId<"messages"> | null;
        };
        html: string;
        text: string;
        guard: {
            context?: any;
            handle: string;
        } | null;
    }[];
    settled?: undefined;
}>>;
/**
 * Called just before a claimed message is sent. 'go' when this drain still holds the lease and the
 * message is still its own: the lease and the claim are renewed, so a batch slower than the lease
 * isn't taken over halfway. 'skip' when the message was settled or cancelled meanwhile. 'lost' when
 * another drain took the lease (this one ran too long): it must stop, since that drain now sends
 * what this one had claimed.
 */
export declare const begin: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"messages">;
    leaseId: string;
    now: number;
    senderKey: string;
}, Promise<"go" | "skip" | "lost">>;
/**
 * Records one attempt. A failure is retried after the settings' retry minutes; after the last retry
 * it is final. `onSettled` comes back only when the outcome is final, never between retries.
 */
export declare const settle: import("convex/server").RegisteredMutation<"public", {
    error?: string | undefined;
    warning?: string | undefined;
    id: import("convex/values").GenericId<"messages">;
    now: number;
}, Promise<{
    id: import("convex/values").GenericId<"messages">;
    onSettled: {
        context?: any;
        handle: string;
    };
    error?: undefined;
} | {
    id: import("convex/values").GenericId<"messages">;
    onSettled: {
        context?: any;
        handle: string;
    };
    error: string;
} | null>>;
/** The guard said the email isn't wanted any more (the thing it was about changed). Not settled: nothing went out or failed. */
export declare const cancel: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"messages">;
    now: number;
}, Promise<null>>;
/**
 * The sender's sign-in stopped working: retrying can't help until someone signs in again, so every
 * queued message for it fails now, and the line shows why.
 */
export declare const failSender: import("convex/server").RegisteredMutation<"public", {
    now: number;
    senderKey: string;
    error: string;
}, Promise<{
    id: import("convex/values").GenericId<"messages">;
    onSettled: {
        context?: any;
        handle: string;
    };
    error: string;
}[]>>;
/**
 * The drain is done for now. Returns when it should run again (the next due message, kept under the
 * same lease) or null, releasing the lease. A mutation, so a message queued meanwhile is either seen
 * here or sees no lease and schedules its own drain.
 */
export declare const release: import("convex/server").RegisteredMutation<"public", {
    leaseId: string;
    now: number;
    senderKey: string;
}, Promise<number | null>>;
//# sourceMappingURL=drain.d.ts.map