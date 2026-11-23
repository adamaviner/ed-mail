export declare const messageStatus: import("convex/values").VUnion<"queued" | "sending" | "sent" | "failed" | "cancelled", [import("convex/values").VLiteral<"queued", "required">, import("convex/values").VLiteral<"sending", "required">, import("convex/values").VLiteral<"sent", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
/** What an email belongs to in the app, e.g. { type: 'eandaApplication', id }. Ids are strings here: the component can't name the app's tables. */
export declare const ref: import("convex/values").VObject<{
    id: string;
    type: string;
}, {
    type: import("convex/values").VString<string, "required">;
    id: import("convex/values").VString<string, "required">;
}, "required", "id" | "type">;
/** An app function, as a handle (createFunctionHandle), and what to pass it. */
export declare const callback: import("convex/values").VObject<{
    context?: any;
    handle: string;
}, {
    handle: import("convex/values").VString<string, "required">;
    context: import("convex/values").VAny<any, "optional", string>;
}, "required", "context" | `context.${string}` | "handle">;
export declare const fileInfo: import("convex/values").VObject<{
    filename: string;
    contentType: string;
    size: number;
}, {
    filename: import("convex/values").VString<string, "required">;
    contentType: import("convex/values").VString<string, "required">;
    size: import("convex/values").VFloat64<number, "required">;
}, "required", "filename" | "contentType" | "size">;
declare const _default: import("convex/server").SchemaDefinition<{
    /** One row per sender line that has a Google account connected. A line with no row isn't connected. */
    senders: import("convex/server").TableDefinition<import("convex/values").VObject<{
        replyTo?: string | undefined;
        accessTokenEnc?: string | undefined;
        connectedBy?: string | undefined;
        fromEmail?: string | undefined;
        fromName?: string | undefined;
        lastError?: string | undefined;
        lastErrorAt?: number | undefined;
        accessTokenExpiresAt?: number | undefined;
        drainLease?: {
            id: string;
            until: number;
        } | undefined;
        watchdogAt?: number | undefined;
        key: string;
        account: string;
        refreshTokenEnc: string;
        connectedAt: number;
    }, {
        key: import("convex/values").VString<string, "required">;
        account: import("convex/values").VString<string, "required">;
        refreshTokenEnc: import("convex/values").VString<string, "required">;
        /** One of the account's Gmail "Send mail as" aliases; none = the account itself. */
        fromEmail: import("convex/values").VString<string | undefined, "optional">;
        fromName: import("convex/values").VString<string | undefined, "optional">;
        replyTo: import("convex/values").VString<string | undefined, "optional">;
        connectedAt: import("convex/values").VFloat64<number, "required">;
        connectedBy: import("convex/values").VString<string | undefined, "optional">;
        /** The last failure that was the sender's fault (not an attachment's), cleared by the next success. */
        lastError: import("convex/values").VString<string | undefined, "optional">;
        lastErrorAt: import("convex/values").VFloat64<number | undefined, "optional">;
        /** An access token kept between sends (encrypted like the refresh token), until it expires. */
        accessTokenEnc: import("convex/values").VString<string | undefined, "optional">;
        accessTokenExpiresAt: import("convex/values").VFloat64<number | undefined, "optional">;
        /** The drain that may send for this sender now: one at a time, so sends are paced per account. */
        drainLease: import("convex/values").VObject<{
            id: string;
            until: number;
        } | undefined, {
            id: import("convex/values").VString<string, "required">;
            until: import("convex/values").VFloat64<number, "required">;
        }, "optional", "id" | "until">;
        /** When the takeover drain for a crashed one is scheduled (lease.ts). */
        watchdogAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "key" | "replyTo" | "accessTokenEnc" | "account" | "refreshTokenEnc" | "connectedAt" | "connectedBy" | "fromEmail" | "fromName" | "lastError" | "lastErrorAt" | "accessTokenExpiresAt" | "drainLease" | "watchdogAt" | "drainLease.id" | "drainLease.until">, {
        by_key: ["key", "_creationTime"];
    }, {}, {}>;
    /** Google sign-ins in progress: the state sent to Google, hashed. */
    oauthStates: import("convex/server").TableDefinition<import("convex/values").VObject<{
        by?: string | undefined;
        senderKey: string;
        expiresAt: number;
        stateHash: string;
    }, {
        stateHash: import("convex/values").VString<string, "required">;
        senderKey: import("convex/values").VString<string, "required">;
        by: import("convex/values").VString<string | undefined, "optional">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "senderKey" | "by" | "expiresAt" | "stateHash">, {
        by_stateHash: ["stateHash", "_creationTime"];
        by_expiresAt: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    /** One row per email. The body is in `bodies`, so lists never read it. */
    messages: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string | undefined;
        warning?: string | undefined;
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
        claimedBy?: string | undefined;
        sentAt?: number | undefined;
        settledAt?: number | undefined;
        reportedAt?: number | undefined;
        resendOf?: import("convex/values").GenericId<"messages"> | undefined;
        kind: string;
        senderKey: string;
        subject: string;
        to: string[];
        status: "queued" | "sending" | "sent" | "failed" | "cancelled";
        toText: string;
        attempts: number;
        nextAttemptAt: number;
    }, {
        kind: import("convex/values").VString<string, "required">;
        senderKey: import("convex/values").VString<string, "required">;
        to: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        /** The recipients in lower case, for searching the log. */
        toText: import("convex/values").VString<string, "required">;
        cc: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        replyTo: import("convex/values").VString<string | undefined, "optional">;
        subject: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"queued" | "sending" | "sent" | "failed" | "cancelled", [import("convex/values").VLiteral<"queued", "required">, import("convex/values").VLiteral<"sending", "required">, import("convex/values").VLiteral<"sent", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        attempts: import("convex/values").VFloat64<number, "required">;
        /** When a queued message is due; while sending, when its claim runs out (a crashed drain). */
        nextAttemptAt: import("convex/values").VFloat64<number, "required">;
        /** While sending, the lease of the drain that claimed it: only that drain may send it. */
        claimedBy: import("convex/values").VString<string | undefined, "optional">;
        error: import("convex/values").VString<string | undefined, "optional">;
        /** Sent, but not quite as asked: e.g. an attachment left off because its link isn't a PDF. */
        warning: import("convex/values").VString<string | undefined, "optional">;
        ref: import("convex/values").VObject<{
            id: string;
            type: string;
        } | undefined, {
            type: import("convex/values").VString<string, "required">;
            id: import("convex/values").VString<string, "required">;
        }, "optional", "id" | "type">;
        /** A grouping for lists, e.g. the event an email is about. */
        scope: import("convex/values").VString<string | undefined, "optional">;
        /** Queueing another message with the same chain cancels this one while it is still queued. */
        chain: import("convex/values").VString<string | undefined, "optional">;
        /** Files the app attaches by name when sending (e.g. 'orientation'). */
        attachments: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        /** Files sent as bytes with sendNow: names and sizes only; the bytes aren't kept, so it can't be resent. */
        files: import("convex/values").VArray<{
            filename: string;
            contentType: string;
            size: number;
        }[] | undefined, import("convex/values").VObject<{
            filename: string;
            contentType: string;
            size: number;
        }, {
            filename: import("convex/values").VString<string, "required">;
            contentType: import("convex/values").VString<string, "required">;
            size: import("convex/values").VFloat64<number, "required">;
        }, "required", "filename" | "contentType" | "size">, "optional">;
        /** Called once, when the outcome is final. */
        onSettled: import("convex/values").VObject<{
            context?: any;
            handle: string;
        } | undefined, {
            handle: import("convex/values").VString<string, "required">;
            context: import("convex/values").VAny<any, "optional", string>;
        }, "optional", "context" | `context.${string}` | "handle">;
        /** Asked before each attempt whether the email is still wanted. */
        guard: import("convex/values").VObject<{
            context?: any;
            handle: string;
        } | undefined, {
            handle: import("convex/values").VString<string, "required">;
            context: import("convex/values").VAny<any, "optional", string>;
        }, "optional", "context" | `context.${string}` | "handle">;
        by: import("convex/values").VString<string | undefined, "optional">;
        sentAt: import("convex/values").VFloat64<number | undefined, "optional">;
        settledAt: import("convex/values").VFloat64<number | undefined, "optional">;
        /** When a failure went out in the daily digest. */
        reportedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        resendOf: import("convex/values").VId<import("convex/values").GenericId<"messages"> | undefined, "optional">;
    }, "required", "kind" | "senderKey" | "error" | "warning" | "chain" | "attachments" | "by" | "cc" | "guard" | "onSettled" | "ref" | "replyTo" | "scope" | "subject" | "to" | "status" | "files" | "toText" | "attempts" | "nextAttemptAt" | "claimedBy" | "sentAt" | "settledAt" | "reportedAt" | "resendOf" | "guard.context" | `guard.context.${string}` | "guard.handle" | "onSettled.context" | `onSettled.context.${string}` | "onSettled.handle" | "ref.id" | "ref.type">, {
        by_sender_due: ["senderKey", "status", "nextAttemptAt", "_creationTime"];
        by_ref: ["ref.type", "ref.id", "_creationTime"];
        by_chain: ["chain", "status", "_creationTime"];
        by_scope: ["scope", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_sender: ["senderKey", "_creationTime"];
        by_kind: ["kind", "_creationTime"];
        by_status_reported: ["status", "reportedAt", "_creationTime"];
    }, {
        search_to: {
            searchField: "toText";
            filterFields: "kind" | "senderKey" | "status";
        };
    }, {}>;
    bodies: import("convex/server").TableDefinition<import("convex/values").VObject<{
        html: string;
        text: string;
        messageId: import("convex/values").GenericId<"messages">;
    }, {
        messageId: import("convex/values").VId<import("convex/values").GenericId<"messages">, "required">;
        html: import("convex/values").VString<string, "required">;
        text: import("convex/values").VString<string, "required">;
    }, "required", "html" | "text" | "messageId">, {
        by_message: ["messageId", "_creationTime"];
    }, {}, {}>;
    /** Saved wording, by kind. A kind with no row uses its built-in text from the app's mail config. */
    texts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedBy?: string | undefined;
        key: string;
        subject: string;
        body: string;
        updatedAt: number;
    }, {
        key: import("convex/values").VString<string, "required">;
        subject: import("convex/values").VString<string, "required">;
        body: import("convex/values").VString<string, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        updatedBy: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "key" | "subject" | "body" | "updatedAt" | "updatedBy">, {
        by_key: ["key", "_creationTime"];
    }, {}, {}>;
    /** At most one row. A missing row or field means the default in settings.ts. */
    settings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        digestTo?: string | undefined;
        retentionDays?: number | undefined;
        retryMinutes?: number[] | undefined;
    }, {
        retentionDays: import("convex/values").VFloat64<number | undefined, "optional">;
        digestTo: import("convex/values").VString<string | undefined, "optional">;
        retryMinutes: import("convex/values").VArray<number[] | undefined, import("convex/values").VFloat64<number, "required">, "optional">;
    }, "required", "digestTo" | "retentionDays" | "retryMinutes">, {}, {}, {}>;
}, true>;
export default _default;
//# sourceMappingURL=schema.d.ts.map