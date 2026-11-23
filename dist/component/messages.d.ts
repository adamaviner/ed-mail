import type { Doc, Id } from './_generated/dataModel.js';
export declare const messageView: import("convex/values").VObject<{
    kind: string;
    id: import("convex/values").GenericId<"messages">;
    senderKey: string;
    error: string | null;
    warning: string | null;
    attachments: string[];
    by: string | null;
    cc: string[];
    ref: {
        id: string;
        type: string;
    } | null;
    replyTo: string | null;
    scope: string | null;
    subject: string;
    to: string[];
    status: "queued" | "sending" | "sent" | "failed" | "cancelled";
    files: {
        filename: string;
        contentType: string;
        size: number;
    }[];
    attempts: number;
    nextAttemptAt: number | null;
    sentAt: number | null;
    settledAt: number | null;
    resendOf: import("convex/values").GenericId<"messages"> | null;
    createdAt: number;
}, {
    id: import("convex/values").VId<import("convex/values").GenericId<"messages">, "required">;
    kind: import("convex/values").VString<string, "required">;
    senderKey: import("convex/values").VString<string, "required">;
    to: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
    cc: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
    replyTo: import("convex/values").VUnion<string | null, [import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    subject: import("convex/values").VString<string, "required">;
    status: import("convex/values").VUnion<"queued" | "sending" | "sent" | "failed" | "cancelled", [import("convex/values").VLiteral<"queued", "required">, import("convex/values").VLiteral<"sending", "required">, import("convex/values").VLiteral<"sent", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
    attempts: import("convex/values").VFloat64<number, "required">;
    nextAttemptAt: import("convex/values").VUnion<number | null, [import("convex/values").VFloat64<number, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    error: import("convex/values").VUnion<string | null, [import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    warning: import("convex/values").VUnion<string | null, [import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    ref: import("convex/values").VUnion<{
        id: string;
        type: string;
    } | null, [import("convex/values").VObject<{
        id: string;
        type: string;
    }, {
        type: import("convex/values").VString<string, "required">;
        id: import("convex/values").VString<string, "required">;
    }, "required", "id" | "type">, import("convex/values").VNull<null, "required">], "required", "id" | "type">;
    scope: import("convex/values").VUnion<string | null, [import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    attachments: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
    files: import("convex/values").VArray<{
        filename: string;
        contentType: string;
        size: number;
    }[], import("convex/values").VObject<{
        filename: string;
        contentType: string;
        size: number;
    }, {
        filename: import("convex/values").VString<string, "required">;
        contentType: import("convex/values").VString<string, "required">;
        size: import("convex/values").VFloat64<number, "required">;
    }, "required", "filename" | "contentType" | "size">, "required">;
    by: import("convex/values").VUnion<string | null, [import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    createdAt: import("convex/values").VFloat64<number, "required">;
    sentAt: import("convex/values").VUnion<number | null, [import("convex/values").VFloat64<number, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    settledAt: import("convex/values").VUnion<number | null, [import("convex/values").VFloat64<number, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    resendOf: import("convex/values").VUnion<import("convex/values").GenericId<"messages"> | null, [import("convex/values").VId<import("convex/values").GenericId<"messages">, "required">, import("convex/values").VNull<null, "required">], "required", never>;
}, "required", "kind" | "id" | "senderKey" | "error" | "warning" | "attachments" | "by" | "cc" | "ref" | "replyTo" | "scope" | "subject" | "to" | "status" | "files" | "attempts" | "nextAttemptAt" | "sentAt" | "settledAt" | "resendOf" | "ref.id" | "ref.type" | "createdAt">;
export declare function view(m: Doc<'messages'>): {
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
export declare const notConnected: (title: string) => string;
/**
 * Queues an email. With no sender connected it is written as failed at once, and `settled` comes
 * back for the caller to report (the outcome is final). `drain` is set when the caller must
 * schedule a drain for the sender (with that lease id, at that time).
 */
export declare const enqueue: import("convex/server").RegisteredMutation<"public", {
    chain?: string | undefined;
    attachments?: string[] | undefined;
    by?: string | undefined;
    cc?: string[] | undefined;
    guard?: {
        context?: any;
        handle: string;
    } | undefined;
    onSettled?: {
        context?: any;
        handle: string;
    } | undefined;
    ref?: {
        id: string;
        type: string;
    } | undefined;
    replyTo?: string | undefined;
    scope?: string | undefined;
    kind: string;
    now: number;
    senderKey: string;
    senderTitle: string;
    html: string;
    subject: string;
    text: string;
    to: string[];
}, Promise<{
    id: import("convex/values").GenericId<"messages">;
    drain: null;
    settled: {
        error: string;
        onSettled: {
            context?: any;
            handle: string;
        } | null;
    };
} | {
    id: import("convex/values").GenericId<"messages">;
    drain: import("./lease.js").DrainToSchedule | null;
    settled: null;
}>>;
/** Logs an email that sendNow is about to send itself (one attempt, no queue). */
export declare const start: import("convex/server").RegisteredMutation<"public", {
    chain?: string | undefined;
    attachments?: string[] | undefined;
    by?: string | undefined;
    cc?: string[] | undefined;
    guard?: {
        context?: any;
        handle: string;
    } | undefined;
    onSettled?: {
        context?: any;
        handle: string;
    } | undefined;
    ref?: {
        id: string;
        type: string;
    } | undefined;
    replyTo?: string | undefined;
    scope?: string | undefined;
    files?: {
        filename: string;
        contentType: string;
        size: number;
    }[] | undefined;
    kind: string;
    now: number;
    senderKey: string;
    senderTitle: string;
    html: string;
    subject: string;
    text: string;
    to: string[];
}, Promise<{
    id: import("convex/values").GenericId<"messages">;
    error: string | null;
}>>;
/** sendNow's outcome. */
export declare const finish: import("convex/server").RegisteredMutation<"public", {
    error?: string | undefined;
    warning?: string | undefined;
    id: import("convex/values").GenericId<"messages">;
    now: number;
}, Promise<null>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"messages">;
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
} | null>>;
/** One message with its body. Apps expose this to admins only. */
export declare const getWithBody: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"messages">;
}, Promise<{
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
} | null>>;
/**
 * The log, newest first, a page at a time. One filter picks the index; the rest filter within it,
 * so a page can come back shorter than asked.
 */
export declare const list: import("convex/server").RegisteredQuery<"public", {
    kind?: string | undefined;
    senderKey?: string | undefined;
    scope?: string | undefined;
    status?: "queued" | "sending" | "sent" | "failed" | "cancelled" | undefined;
    paginationOpts: {
        id?: number;
        endCursor?: string | null;
        maximumRowsRead?: number;
        maximumBytesRead?: number;
        numItems: number;
        cursor: string | null;
    };
}, Promise<{
    page: {
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
    }[];
    isDone: boolean;
    continueCursor: import("convex/server").Cursor;
    splitCursor?: import("convex/server").Cursor | null;
    pageStatus?: "SplitRecommended" | "SplitRequired" | null;
}>>;
/** Messages to or copied to an address (or part of one), best matches first. */
export declare const search: import("convex/server").RegisteredQuery<"public", {
    kind?: string | undefined;
    senderKey?: string | undefined;
    limit?: number | undefined;
    status?: "queued" | "sending" | "sent" | "failed" | "cancelled" | undefined;
    text: string;
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
/** The latest email about this thing, for a status badge beside it. */
export declare const statusFor: import("convex/server").RegisteredQuery<"public", {
    kind?: string | undefined;
    ref: {
        id: string;
        type: string;
    };
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
} | null>>;
export declare const cancelChain: import("convex/server").RegisteredMutation<"public", {
    now: number;
    chain: string;
}, Promise<number>>;
/** How many emails failed since `since` (counted up to `cap`), for a count on an overview page. */
export declare const failedSince: import("convex/server").RegisteredQuery<"public", {
    cap?: number | undefined;
    since: number;
}, Promise<number>>;
/** Queues again every email from this sender that failed since `since`. Returns how many, and a drain lease to schedule. */
export declare const retryFailed: import("convex/server").RegisteredMutation<"public", {
    now: number;
    senderKey: string;
    since: number;
}, Promise<{
    count: number;
    drain: import("./lease.js").DrainToSchedule | null;
}>>;
/** Queues a copy of a message with its stored body (its own row, so the log keeps both). */
export declare const resend: import("convex/server").RegisteredMutation<"public", {
    by?: string | undefined;
    id: import("convex/values").GenericId<"messages">;
    now: number;
    senderTitle: string;
}, Promise<{
    id: import("convex/values").GenericId<"messages">;
    drain: null;
    settled: {
        error: string;
        onSettled: {
            context?: any;
            handle: string;
        } | null;
    };
} | {
    id: Id<"messages">;
    drain: import("./lease.js").DrainToSchedule | null;
    settled: null;
}>>;
//# sourceMappingURL=messages.d.ts.map