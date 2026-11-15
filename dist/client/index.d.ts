import { type FunctionReference, type HttpRouter } from 'convex/server';
import { v, type Infer } from 'convex/values';
import type { FunctionArgs, FunctionReturnType, Scheduler } from 'convex/server';
import type { ComponentApi } from '../component/_generated/component.js';
import { type BuiltInKind, type MailConfig } from '../core/config.js';
import { type GoogleClient } from '../core/google.js';
import { type MimeAttachment } from '../core/mime.js';
import { adminApi, type AdminApiOptions } from './admin.js';
export type { ComponentApi };
export { adminApi };
export type { AdminApiOptions };
type RunQuery = <Q extends FunctionReference<'query', 'public' | 'internal'>>(query: Q, args: FunctionArgs<Q>) => Promise<FunctionReturnType<Q>>;
type RunMutation = <M extends FunctionReference<'mutation', 'public' | 'internal'>>(mutation: M, args: FunctionArgs<M>) => Promise<FunctionReturnType<M>>;
export type RunQueryCtx = {
    runQuery: RunQuery;
};
export type RunMutationCtx = {
    runQuery: RunQuery;
    runMutation: RunMutation;
};
export type EnqueueCtx = RunMutationCtx & {
    scheduler: Scheduler;
};
export type RunActionCtx = EnqueueCtx;
export type SenderOf<C> = C extends MailConfig<infer S, string> ? S : never;
export type KindOf<C> = C extends MailConfig<string, infer K> ? K | BuiltInKind : never;
/** What an app's onSettled mutation receives. Use `settledArgs` as its args. */
export declare const settledArgs: {
    messageId: import("convex/values").VString<string, "required">;
    ok: import("convex/values").VBoolean<boolean, "required">;
    error: import("convex/values").VString<string | undefined, "optional">;
    context: import("convex/values").VAny<any, "required", string>;
};
export type Settled = Infer<ReturnType<typeof v.object<typeof settledArgs>>>;
/** What an app's guard query receives; it returns whether the email is still wanted. */
export declare const guardArgs: {
    messageId: import("convex/values").VString<string, "required">;
    context: import("convex/values").VAny<any, "required", string>;
};
export type SettledRef = FunctionReference<'mutation', 'internal', Settled>;
export type GuardRef = FunctionReference<'query', 'internal', {
    messageId: string;
    context: unknown;
}, boolean>;
export interface OutgoingMessage<C extends MailConfig> {
    kind: KindOf<C>;
    to: string | string[];
    cc?: string[];
    replyTo?: string;
    subject: string;
    /** At least one of html and text; the other is made from it. */
    html?: string;
    text?: string;
    /** Defaults to the kind's sender. */
    sender?: SenderOf<C>;
    /** What the email is about in the app, for the badge beside it and the log's link. */
    ref?: {
        type: string;
        id: string;
    };
    scope?: string;
    /** Queueing with the same chain cancels an older one still queued, so a resend during retries sends once. */
    chain?: string;
    /** Named files (MailOptions.attachments), fetched when sending. */
    attachments?: string[];
    /** Called once with the final outcome: sent, or failed after the retries. */
    onSettled?: {
        fn: SettledRef;
        context?: unknown;
    };
    /** Asked before each attempt whether the email is still wanted; if not, it is cancelled quietly. */
    guard?: {
        fn: GuardRef;
        context?: unknown;
    };
    /** Who caused it, for the log. */
    by?: string;
}
export interface MailOptions<C extends MailConfig> {
    config: C;
    /** The Google OAuth client, read from the app's environment when called; null when not set up. */
    google: () => GoogleClient | null;
    /** The secret Google tokens are encrypted with (ed-schedule: GOOGLE_CLIENT_SECRET). */
    encryptionSecret: () => string | undefined;
    /** The deployment's HTTP actions URL (process.env.CONVEX_SITE_URL), for Google's redirect. */
    siteUrl: () => string;
    /** Where Google sends people back to on the app's HTTP router. Register it in Google Cloud. */
    callbackPath?: string;
    /** Where the browser goes after a sign-in: the app's page for senders. */
    afterConnect: (result: {
        senderKey?: string;
        error?: string;
    }) => string;
    /** The app's worker (convex/mailWorker.ts re-exporting mail.worker()), for scheduling it. */
    worker: {
        drain: FunctionReference<'action', 'internal', {
            senderKey: string;
            leaseId: string;
        }, null>;
        revoke: FunctionReference<'action', 'internal', {
            refreshTokenEnc: string;
        }, null>;
    };
    /** Named attachments: the file to attach, or null to send without it. Fetched once per drain. */
    attachments?: Record<string, (ctx: RunQueryCtx) => Promise<MimeAttachment | null>>;
    /** A link to the log, for the failure report. */
    logUrl?: () => string | undefined;
    /** Pause between two sends from one account. Gmail allows roughly 150 a minute. */
    pauseMs?: number;
    /** For tests: how to wait. */
    sleep?: (ms: number) => Promise<void>;
    /** Messages a drain claims at a time. */
    batch?: number;
}
/** Fetches a file from the web to attach (e.g. a PDF linked from a setting). */
export declare function fetchAttachment(url: string, fallbackName: string): Promise<MimeAttachment>;
export declare function sha256Hex(text: string): Promise<string>;
export declare class Mail<C extends MailConfig> {
    readonly component: ComponentApi;
    readonly options: MailOptions<C>;
    constructor(component: ComponentApi, options: MailOptions<C>);
    get config(): C;
    senderTitle(key: string): string;
    private kindSpec;
    /** The row fields shared by enqueue and sendNow, checked. */
    private prepare;
    /**
     * Queues an email from a mutation, in the caller's transaction, and makes sure its sender's drain
     * will run. Returns the message id. With no sender connected the email is logged as failed and
     * onSettled is called at once, in this transaction.
     */
    enqueue(ctx: EnqueueCtx, msg: OutgoingMessage<C>): Promise<string>;
    /** Schedules the drain a queued email needs, or reports an email that failed at once (no sender connected). */
    private afterQueued;
    /**
     * Sends one email now, from an action: one attempt, logged, the outcome returned. For test sends,
     * emails with file bytes (which aren't stored, so the log can't resend them), and "send now" buttons.
     */
    sendNow(ctx: RunActionCtx, msg: Omit<OutgoingMessage<C>, 'onSettled' | 'guard' | 'chain'> & {
        files?: MimeAttachment[];
    }): Promise<{
        id: string;
        ok: true;
    } | {
        id: string;
        ok: false;
        error: string;
    }>;
    /** Cancels the still-queued emails of a chain (e.g. an offer that was withdrawn). */
    cancelChain(ctx: RunMutationCtx, chain: string): Promise<number>;
    /** The latest email about this thing (optionally of one kind), for a status badge. */
    statusFor(ctx: RunQueryCtx, ref: {
        type: string;
        id: string;
    }, kind?: KindOf<C>): Promise<{
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
    } | null>;
    /** Whether email for this sender can go out: Google is set up and an account is connected. */
    ready(ctx: RunQueryCtx, senderKey: SenderOf<C>): Promise<boolean>;
    /** The address a sender sends as (never its token), e.g. where staff notices go. */
    noticeAddress(ctx: RunQueryCtx, senderKey: SenderOf<C>): Promise<string | null>;
    /** The wording for a kind: the saved one, else the built-in. */
    text(ctx: RunQueryCtx, kind: KindOf<C>): Promise<{
        subject: string;
        body: string;
        custom: boolean;
    }>;
    /** Saves wording for a kind: cleaned (safeHtml) and checked against the kind's placeholders first. Returns it as stored. */
    saveText(ctx: RunMutationCtx, kind: KindOf<C>, t: {
        subject: string;
        body: string;
    }, by?: string): Promise<{
        subject: string;
        body: string;
    }>;
    resetText(ctx: RunMutationCtx, kind: KindOf<C>): Promise<void>;
    settings(ctx: RunQueryCtx): Promise<{
        digestTo: string;
        retentionDays: number;
        retryMinutes: Array<number>;
    }>;
    updateSettings(ctx: RunMutationCtx, patch: {
        retentionDays?: number;
        digestTo?: string;
        retryMinutes?: number[];
    }): Promise<void>;
    /** Deletes what the retention setting no longer keeps, a batch at a time; call again while `more`. For the app's nightly cleanup. */
    cleanup(ctx: RunMutationCtx): Promise<{
        deleted: number;
        more: boolean;
    }>;
    /** Queues again the emails from a sender that failed in the last week (after it was connected or repaired). */
    retryFailed(ctx: EnqueueCtx, senderKey: SenderOf<C>): Promise<number>;
    /** Queues the stored copy of an email again. Only for kinds that resend 'stored'. */
    resend(ctx: EnqueueCtx, messageId: string, by?: string): Promise<string>;
    private secret;
    private googleClient;
    /** An access token for the sender: the cached one while it has a minute left, else a fresh one, cached. */
    private token;
    private mime;
    private problem;
    private namedAttachments;
    private callSettled;
    /** Sends what is due for one sender, paced, then schedules itself for the next due time or stops. */
    drain(ctx: RunActionCtx, senderKey: string, leaseId: string): Promise<void>;
    /** Records one attempt; calls onSettled when that was the last word. */
    private settle;
    /**
     * Emails the failures nobody was told about yet to the address in the settings (none: nothing),
     * from the digest sender, or any healthy one if that one is broken. Marks them reported once sent.
     */
    digest(ctx: RunActionCtx): Promise<{
        sent: number;
    } | null>;
    /** The internal actions the app exports from convex/mailWorker.ts: `export const { drain, revoke, digest } = mail.worker()`. */
    worker(): {
        drain: import("convex/server").RegisteredAction<"internal", {
            leaseId: string;
            senderKey: string;
        }, Promise<null>>;
        revoke: import("convex/server").RegisteredAction<"internal", {
            refreshTokenEnc: string;
        }, Promise<null>>;
        digest: import("convex/server").RegisteredAction<"internal", {}, Promise<null>>;
    };
    redirectUri(): string;
    /** Starts a sign-in for one sender line; the browser goes to the URL this returns. */
    startConnect(ctx: RunMutationCtx, senderKey: string, by?: string): Promise<{
        url: string;
    }>;
    /**
     * Google's redirect back after a sign-in. Returns null when the state isn't one of this
     * library's, so an app with other Google sign-ins on the same path can try its own next.
     */
    handleOAuthCallback(ctx: RunActionCtx, request: Request): Promise<Response | null>;
    /** Adds the Google callback to the app's router, when nothing else of the app's uses the same path. */
    registerRoutes(http: HttpRouter): void;
    /** The admin queries and mutations, each behind the app's own checks: `export const { ... } = mail.adminApi({...})` in convex/mailAdmin.ts. */
    adminApi(o: AdminApiOptions): {
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
        disconnect: import("convex/server").RegisteredMutation<"public", {
            senderKey: string;
            auth: any;
        }, Promise<void>>;
        sendTest: import("convex/server").RegisteredMutation<"public", {
            letter?: {
                html: string;
                subject: string;
            } | undefined;
            senderKey: string;
            auth: any;
        }, Promise<string>>;
        retryFailed: import("convex/server").RegisteredMutation<"public", {
            senderKey: string;
            auth: any;
        }, Promise<number>>;
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
        resend: import("convex/server").RegisteredMutation<"public", {
            id: string;
            auth: any;
        }, Promise<string>>;
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
        }, Promise<{
            subject: string;
            body: string;
        }>>;
        resetText: import("convex/server").RegisteredMutation<"public", {
            kind: string;
            auth: any;
        }, Promise<void>>;
    };
}
//# sourceMappingURL=index.d.ts.map