import type { Doc } from './_generated/dataModel.js';
import { type QueryCtx } from './_generated/server.js';
export declare const senderDoc: (ctx: QueryCtx, key: string) => Promise<{
    _id: import("convex/values").GenericId<"senders">;
    _creationTime: number;
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
} | null>;
export declare const senderView: import("convex/values").VObject<{
    key: string;
    replyTo: string | null;
    account: string;
    connectedAt: number;
    connectedBy: string | null;
    fromEmail: string | null;
    fromName: string | null;
    lastError: string | null;
    lastErrorAt: number | null;
}, {
    key: import("convex/values").VString<string, "required">;
    account: import("convex/values").VString<string, "required">;
    fromEmail: import("convex/values").VUnion<string | null, [import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    fromName: import("convex/values").VUnion<string | null, [import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    replyTo: import("convex/values").VUnion<string | null, [import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    connectedAt: import("convex/values").VFloat64<number, "required">;
    connectedBy: import("convex/values").VUnion<string | null, [import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    lastError: import("convex/values").VUnion<string | null, [import("convex/values").VString<string, "required">, import("convex/values").VNull<null, "required">], "required", never>;
    lastErrorAt: import("convex/values").VUnion<number | null, [import("convex/values").VFloat64<number, "required">, import("convex/values").VNull<null, "required">], "required", never>;
}, "required", "key" | "replyTo" | "account" | "connectedAt" | "connectedBy" | "fromEmail" | "fromName" | "lastError" | "lastErrorAt">;
/** What anyone outside the worker may see of a sender: everything but the tokens. */
export declare const shown: (s: Doc<"senders">) => {
    key: string;
    account: string;
    fromEmail: string | null;
    fromName: string | null;
    replyTo: string | null;
    connectedAt: number;
    connectedBy: string | null;
    lastError: string | null;
    lastErrorAt: number | null;
};
/** Every connected sender (a handful of rows). */
export declare const list: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    key: string;
    account: string;
    fromEmail: string | null;
    fromName: string | null;
    replyTo: string | null;
    connectedAt: number;
    connectedBy: string | null;
    lastError: string | null;
    lastErrorAt: number | null;
}[]>>;
/** The whole row, tokens included: only for the app's worker and sendNow. */
export declare const credentials: import("convex/server").RegisteredQuery<"public", {
    key: string;
}, Promise<{
    key: string;
    account: string;
    refreshTokenEnc: string;
    fromEmail: string | undefined;
    fromName: string | undefined;
    replyTo: string | undefined;
    lastError: string | undefined;
    accessTokenEnc: string | undefined;
    accessTokenExpiresAt: number | undefined;
} | null>>;
/** The address a sender sends as, for staff notices (which go to the sending account's own address). */
export declare const address: import("convex/server").RegisteredQuery<"public", {
    key: string;
}, Promise<string | null>>;
/** Starts a Google sign-in for one line. Returns the current account, as Google's login hint. */
export declare const startConnect: import("convex/server").RegisteredMutation<"public", {
    by?: string | undefined;
    key: string;
    expiresAt: number;
    stateHash: string;
}, Promise<string | null>>;
/** The line a sign-in belongs to, if the state is this library's and hasn't expired. */
export declare const peekState: import("convex/server").RegisteredQuery<"public", {
    now: number;
    stateHash: string;
}, Promise<{
    senderKey: string;
} | null>>;
/** Saves the account Google signed in as, for the line the sign-in started from. */
export declare const finishConnect: import("convex/server").RegisteredMutation<"public", {
    now: number;
    account: string;
    refreshTokenEnc: string;
    stateHash: string;
}, Promise<{
    senderKey: string;
} | null>>;
/** Copies a sender as it is, token included: for an app moving its existing sign-ins into the library. */
export declare const importSender: import("convex/server").RegisteredMutation<"public", {
    replyTo?: string | undefined;
    connectedBy?: string | undefined;
    fromEmail?: string | undefined;
    fromName?: string | undefined;
    key: string;
    account: string;
    refreshTokenEnc: string;
    connectedAt: number;
}, Promise<null>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    key: string;
    replyTo: string;
    fromEmail: string;
    fromName: string;
}, Promise<null>>;
/**
 * Disconnects a line. Returns its refresh token when no other line still sends as the same account,
 * so the app can revoke it (unless something of its own, like a read-only inbox, uses the account).
 */
export declare const disconnect: import("convex/server").RegisteredMutation<"public", {
    key: string;
}, Promise<{
    account: string;
    refreshTokenEnc: string | null;
} | null>>;
/** Keeps the line's last failure (cleared with no error), for Admin. */
export declare const recordError: import("convex/server").RegisteredMutation<"public", {
    error?: string | undefined;
    key: string;
    now: number;
}, Promise<null>>;
/** Keeps an access token for later sends from this line, until it expires. */
export declare const cacheToken: import("convex/server").RegisteredMutation<"public", {
    key: string;
    accessTokenEnc: string;
    expiresAt: number;
}, Promise<null>>;
//# sourceMappingURL=senders.d.ts.map