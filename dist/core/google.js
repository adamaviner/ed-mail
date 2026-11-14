// Google sign-in (OAuth 2.0, web server flow) and Gmail's send endpoint, with plain fetch. Each
// sender is one Google account that allowed the app to send mail as it (gmail.send only: such a
// sign-in can't read the mailbox). An app may use the same helpers for a read-only sign-in of its
// own (ed-schedule's chef inbox). Nothing here reads the environment: the app passes its OAuth
// client in.
export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
/**
 * A failure talking to Google. `auth` is true when the sign-in itself no longer works (a revoked
 * grant, a changed password, a rejected access token), so retrying can't help until someone signs
 * in again.
 */
export class GoogleError extends Error {
    auth;
    constructor(message, auth) {
        super(message);
        this.auth = auth;
        this.name = 'GoogleError';
    }
}
/** Google's sign-in page, asking for the account's email and this one Gmail scope. */
export function authUrl(o) {
    const params = new URLSearchParams({
        client_id: o.clientId,
        redirect_uri: o.redirectUri,
        response_type: 'code',
        scope: ['openid', 'email', o.scope].join(' '),
        // offline + consent: Google hands back a refresh token every time, so the app can keep sending (or reading).
        access_type: 'offline',
        prompt: 'consent select_account',
        state: o.state,
    });
    if (o.loginHint)
        params.set('login_hint', o.loginHint);
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
async function tokenRequest(params) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
    });
    const body = (await res.json().catch(() => ({})));
    if (!res.ok)
        throw googleProblem(body, res.status);
    return body;
}
function googleProblem(body, status) {
    const err = body.error;
    if (err === 'invalid_grant')
        return new GoogleError('Google no longer accepts this sign-in (the password changed or access was removed). Sign in to Google again.', true);
    const detail = typeof body.error_description === 'string' ? body.error_description : typeof err === 'string' ? err : JSON.stringify(err ?? body);
    return new GoogleError(`Google answered ${status}: ${detail}`, status === 401);
}
const SCOPE_MISSING = {
    [GMAIL_SEND_SCOPE]: 'Google sign-in didn’t include permission to send email. Try again and tick “Send email on your behalf”.',
    [GMAIL_READONLY_SCOPE]: 'Google sign-in didn’t include permission to read email. Try again and tick “View your email messages and settings”.',
};
/** Trades the code Google sent back for a refresh token (which must carry `scope`), and says which account signed in. */
export async function exchangeCode(o) {
    const body = await tokenRequest({ code: o.code, client_id: o.client.id, client_secret: o.client.secret, redirect_uri: o.redirectUri, grant_type: 'authorization_code' });
    const scopes = String(body.scope ?? '').split(' ');
    if (!scopes.includes(o.scope))
        throw new GoogleError(SCOPE_MISSING[o.scope], false);
    if (typeof body.refresh_token !== 'string')
        throw new GoogleError('Google didn’t hand back a refresh token. Try again.', false);
    // The ID token came straight from Google over HTTPS, so its claims can be read without checking the signature.
    const claims = JSON.parse(atob(String(body.id_token ?? '')
        .split('.')[1]
        ?.replace(/-/g, '+')
        .replace(/_/g, '/') ?? '') || '{}');
    if (typeof claims.email !== 'string')
        throw new GoogleError('Google didn’t say which account signed in. Try again.', false);
    return { refreshToken: body.refresh_token, email: claims.email.toLowerCase() };
}
/** A fresh access token, and when it stops working (ms). Google's last about an hour. */
export async function accessToken(client, refreshToken) {
    const body = await tokenRequest({ refresh_token: refreshToken, client_id: client.id, client_secret: client.secret, grant_type: 'refresh_token' });
    if (typeof body.access_token !== 'string')
        throw new GoogleError('Google didn’t hand back an access token.', false);
    const seconds = typeof body.expires_in === 'number' ? body.expires_in : 3600;
    return { token: body.access_token, expiresAt: Date.now() + seconds * 1000 };
}
/** Sends a raw MIME message (./mime.ts) from the signed-in account. */
export async function gmailSend(token, mime) {
    const res = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'message/rfc822' },
        body: mime,
    });
    if (res.ok)
        return;
    const body = (await res.json().catch(() => ({})));
    throw new GoogleError(`Gmail answered ${res.status}: ${body.error?.message ?? res.statusText}`, res.status === 401);
}
/** Tells Google the app no longer needs the token. Best effort. */
export async function revoke(refreshToken) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' }).catch(() => { });
}
//# sourceMappingURL=google.js.map