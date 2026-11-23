/**
 * Deletes messages (and their bodies) older than the retention setting, a batch at a time, and
 * sign-ins that were never finished. Queued and sending messages are kept whatever their age.
 * `more` says there is more to delete: call again.
 */
export declare const cleanup: import("convex/server").RegisteredMutation<"public", {
    batch?: number | undefined;
    now: number;
}, Promise<{
    deleted: number;
    more: boolean;
}>>;
/** Failures not yet reported, oldest first. The report's own failures are left out, so it never reports itself. */
export declare const unreported: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
}, Promise<{
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
}[]>>;
export declare const markReported: import("convex/server").RegisteredMutation<"public", {
    now: number;
    ids: import("convex/values").GenericId<"messages">[];
}, Promise<null>>;
//# sourceMappingURL=maintenance.d.ts.map