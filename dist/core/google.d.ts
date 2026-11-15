export declare const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export declare const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export type GmailScope = typeof GMAIL_SEND_SCOPE | typeof GMAIL_READONLY_SCOPE;
/** The OAuth client from Google Cloud. */
export interface GoogleClient {
    id: string;
    secret: string;
}
/**
 * A failure talking to Google. `auth` is true when the sign-in itself no longer works (a revoked
 * grant, a changed password, a rejected access token), so retrying can't help until someone signs
 * in again.
 */
export declare class GoogleError extends Error {
    readonly auth: boolean;
    constructor(message: string, auth: boolean);
}
/** Google's sign-in page, asking for the account's email and this one Gmail scope. */
export declare function authUrl(o: {
    clientId: string;
    redirectUri: string;
    state: string;
    scope: GmailScope;
    loginHint?: string;
}): string;
/** Trades the code Google sent back for a refresh token (which must carry `scope`), and says which account signed in. */
export declare function exchangeCode(o: {
    client: GoogleClient;
    redirectUri: string;
    code: string;
    scope: GmailScope;
}): Promise<{
    refreshToken: string;
    email: string;
}>;
/** A fresh access token, and when it stops working (ms). Google's last about an hour. */
export declare function accessToken(client: GoogleClient, refreshToken: string): Promise<{
    token: string;
    expiresAt: number;
}>;
/** Sends a raw MIME message (./mime.ts) from the signed-in account. */
export declare function gmailSend(token: string, mime: string): Promise<void>;
/** Tells Google the app no longer needs the token. Best effort. */
export declare function revoke(refreshToken: string): Promise<void>;
//# sourceMappingURL=google.d.ts.map