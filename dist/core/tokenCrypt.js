// Encrypts Google tokens before they're stored, so a copy of the database alone can't send mail as
// the organisation. The app passes the secret (ed-schedule: GOOGLE_CLIENT_SECRET, since a token is
// no use without it anyway); changing it means signing in to Google again.
import { bytesToBase64 } from './mime.js';
const encoder = new TextEncoder();
// The label is fixed: ed-schedule stored tokens with it before the library existed, and its
// migration copies them as they are.
async function key(secret) {
    if (!secret)
        throw new Error('No encryption secret was given for Google tokens.');
    const raw = await crypto.subtle.digest('SHA-256', encoder.encode(`ed-events mail sender:${secret}`));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const fromBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
/** "iv.ciphertext", both base64. */
export async function encryptToken(secret, token) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(secret), encoder.encode(token));
    return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(sealed))}`;
}
export async function decryptToken(secret, stored) {
    const [iv, data] = stored.split('.');
    const opened = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, await key(secret), fromBase64(data));
    return new TextDecoder().decode(opened);
}
//# sourceMappingURL=tokenCrypt.js.map