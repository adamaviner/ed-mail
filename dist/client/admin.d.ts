import { type GenericDataModel, type GenericMutationCtx, type GenericQueryCtx } from 'convex/server';
import type { MailConfig } from '../core/config.js';
import type { Mail } from './index.js';
export interface Who {
    /** For the log and "Saved by". */
    name?: string;
    /** Where "Send test to me" goes. */
    email?: string;
}
export interface AdminApiOptions {
    /** Throws unless `auth` is an admin's: senders, settings, wording, bodies, resending. */
    requireAdmin: (ctx: GenericQueryCtx<GenericDataModel>, auth: unknown) => Promise<Who>;
    /** Throws unless `auth` may see the log without bodies. */
    requireStaff: (ctx: GenericQueryCtx<GenericDataModel>, auth: unknown) => Promise<Who>;
    /** Whether something else of the app still uses this Google account, so disconnecting must not revoke its grant. */
    keepGrant?: (ctx: GenericMutationCtx<GenericDataModel>, account: string) => Promise<boolean>;
}
export declare function adminApi<C extends MailConfig>(mail: Mail<C>, o: AdminApiOptions): {
    /** The sender lines: whether Google is set up, the redirect address to register, and each line's account. */
    senders: import("convex/server").RegisteredQuery<"public", {
        auth: any;
    }, Promise<{
        googleReady: boolean;
        redirectUri: string;
        senders: {
            key: string;
            title: string;
            sender: {
                account: string;
                connectedAt: number;
                connectedBy: string | null;
                fromEmail: string | null;
                fromName: string | null;
                key: string;
                lastError: string | null;
                lastErrorAt: number | null;
                replyTo: string | null;
            } | null;
        }[];
    }>>;
    startConnect: import("convex/server").RegisteredMutation<"public", {
        senderKey: string;
        auth: any;
    }, Promise<{
        url: string;
    }>>;
    updateSender: import("convex/server").RegisteredMutation<"public", {
        senderKey: string;
        replyTo: string;
        fromEmail: string;
        fromName: string;
        auth: any;
    }, Promise<void>>;
    /** Disconnects a line; revokes the Google grant unless another line or the app still uses that account. */
    disconnect: import("convex/server").RegisteredMutation<"public", {
        senderKey: string;
        auth: any;
    }, Promise<void>>;
    /** Queues a short test from one line to the admin pressing the button. Returns the message id, to watch in the log. */
    sendTest: import("convex/server").RegisteredMutation<"public", {
        senderKey: string;
        auth: any;
    }, Promise<string>>;
    /** Queues again what this line failed to send in the last week. */
    retryFailed: import("convex/server").RegisteredMutation<"public", {
        senderKey: string;
        auth: any;
    }, Promise<number>>;
    /** The log, newest first, without bodies (staff may see it). */
    messages: import("convex/server").RegisteredQuery<"public", {
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
        auth: any;
    }, Promise<{
        continueCursor: string;
        isDone: boolean;
        page: Array<{
            attachments: Array<string>;
            attempts: number;
            by: string | null;
            cc: Array<string>;
            createdAt: number;
            error: string | null;
            files: Array<{
                contentType: string;
                filename: string;
                size: number;
            }>;
            id: string;
            kind: string;
            nextAttemptAt: number | null;
            ref: {
                id: string;
                type: string;
            } | null;
            replyTo: string | null;
            resendOf: string | null;
            scope: string | null;
            senderKey: string;
            sentAt: number | null;
            settledAt: number | null;
            status: "queued" | "sending" | "sent" | "failed" | "cancelled";
            subject: string;
            to: Array<string>;
        }>;
        pageStatus?: "SplitRecommended" | "SplitRequired" | null;
        splitCursor?: string | null;
    }>>;
    /** The log searched by recipient, without bodies. */
    searchMessages: import("convex/server").RegisteredQuery<"public", {
        kind?: string | undefined;
        senderKey?: string | undefined;
        status?: "queued" | "sending" | "sent" | "failed" | "cancelled" | undefined;
        text: string;
        auth: any;
    }, Promise<{
        attachments: Array<string>;
        attempts: number;
        by: string | null;
        cc: Array<string>;
        createdAt: number;
        error: string | null;
        files: Array<{
            contentType: string;
            filename: string;
            size: number;
        }>;
        id: string;
        kind: string;
        nextAttemptAt: number | null;
        ref: {
            id: string;
            type: string;
        } | null;
        replyTo: string | null;
        resendOf: string | null;
        scope: string | null;
        senderKey: string;
        sentAt: number | null;
        settledAt: number | null;
        status: "queued" | "sending" | "sent" | "failed" | "cancelled";
        subject: string;
        to: Array<string>;
    }[]>>;
    /** One email with its body: admins only. */
    message: import("convex/server").RegisteredQuery<"public", {
        id: string;
        auth: any;
    }, Promise<{
        html: string;
        message: {
            attachments: Array<string>;
            attempts: number;
            by: string | null;
            cc: Array<string>;
            createdAt: number;
            error: string | null;
            files: Array<{
                contentType: string;
                filename: string;
                size: number;
            }>;
            id: string;
            kind: string;
            nextAttemptAt: number | null;
            ref: {
                id: string;
                type: string;
            } | null;
            replyTo: string | null;
            resendOf: string | null;
            scope: string | null;
            senderKey: string;
            sentAt: number | null;
            settledAt: number | null;
            status: "queued" | "sending" | "sent" | "failed" | "cancelled";
            subject: string;
            to: Array<string>;
        };
        text: string;
    } | null>>;
    /** Sends the stored copy again (kinds that resend 'stored'). */
    resend: import("convex/server").RegisteredMutation<"public", {
        id: string;
        auth: any;
    }, Promise<string>>;
    /** How many emails failed in the last week (up to 100), for an overview page. */
    failureCount: import("convex/server").RegisteredQuery<"public", {
        auth: any;
    }, Promise<number>>;
    settings: import("convex/server").RegisteredQuery<"public", {
        auth: any;
    }, Promise<{
        digestTo: string;
        retentionDays: number;
        retryMinutes: Array<number>;
    }>>;
    updateSettings: import("convex/server").RegisteredMutation<"public", {
        digestTo?: string | undefined;
        retentionDays?: number | undefined;
        auth: any;
    }, Promise<void>>;
    /** Every editable kind's wording: saved or built-in, with the built-in beside it. */
    texts: import("convex/server").RegisteredQuery<"public", {
        auth: any;
    }, Promise<{
        kind: string;
        subject: string;
        body: string;
        custom: boolean;
        updatedAt: number | null;
        updatedBy: string | null;
        builtIn: {
            subject: string;
            body: string;
        };
    }[]>>;
    saveText: import("convex/server").RegisteredMutation<"public", {
        kind: string;
        subject: string;
        body: string;
        auth: any;
    }, Promise<void>>;
    resetText: import("convex/server").RegisteredMutation<"public", {
        kind: string;
        auth: any;
    }, Promise<void>>;
};
//# sourceMappingURL=admin.d.ts.map