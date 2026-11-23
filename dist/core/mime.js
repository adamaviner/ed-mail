// Builds an email as raw MIME text, for Gmail's send endpoint (convex/lib/google.ts). Every part
// is base64, so any text and any file go through unchanged.
import { emailDocument } from './emailHtml.js';
const encoder = new TextEncoder();
export function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
}
/** Base64 in lines of 76 characters, as MIME wants. */
const wrapped = (bytes) => bytesToBase64(bytes).replace(/.{76}(?=.)/g, '$&\r\n');
/** A header value: as is when plain ASCII, else an RFC 2047 encoded word. */
export function headerText(value) {
    const clean = value.replace(/[\r\n]+/g, ' ');
    return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${bytesToBase64(encoder.encode(clean))}?=`;
}
/** "Name" <email>, or just the email. */
export function formatAddress(email, name) {
    const clean = email.replace(/[\r\n<>"]/g, '').trim();
    if (!name?.trim())
        return clean;
    const n = name.replace(/[\r\n]+/g, ' ').trim();
    return /^[\x20-\x7e]*$/.test(n) ? `"${n.replace(/["\\]/g, '\\$&')}" <${clean}>` : `${headerText(n)} <${clean}>`;
}
const cleanList = (addresses) => addresses.map((a) => a.replace(/[\r\n,<>"]/g, '').trim()).filter(Boolean);
/** The whole message, with CRLF line ends. `boundary` is fixed only by tests. */
export function buildMime(mail, boundary = crypto.randomUUID().replace(/-/g, '')) {
    const alt = `alt_${boundary}`;
    const mixed = `mixed_${boundary}`;
    const headers = [
        `From: ${formatAddress(mail.from.email, mail.from.name)}`,
        `To: ${cleanList(mail.to).join(', ')}`,
        ...(mail.cc?.length ? [`Cc: ${cleanList(mail.cc).join(', ')}`] : []),
        ...(mail.replyTo ? [`Reply-To: ${cleanList([mail.replyTo]).join('')}`] : []),
        `Subject: ${headerText(mail.subject)}`,
        'MIME-Version: 1.0',
    ];
    const part = (contentType, data, extra = []) => [`Content-Type: ${contentType}`, 'Content-Transfer-Encoding: base64', ...extra, '', wrapped(data)].join('\r\n');
    const body = [
        `--${alt}`,
        part('text/plain; charset=UTF-8', encoder.encode(mail.text ?? '')),
        `--${alt}`,
        part('text/html; charset=UTF-8', encoder.encode(emailDocument(mail.html))),
        `--${alt}--`,
    ].join('\r\n');
    if (!mail.attachments?.length)
        return [...headers, `Content-Type: multipart/alternative; boundary="${alt}"`, '', body, ''].join('\r\n');
    const files = mail.attachments.map((a) => {
        const name = headerText(a.filename.replace(/["\\]/g, ''));
        return [`--${mixed}`, part(`${a.contentType}; name="${name}"`, a.data, [`Content-Disposition: attachment; filename="${name}"`])].join('\r\n');
    });
    return [...headers, `Content-Type: multipart/mixed; boundary="${mixed}"`, '', `--${mixed}`, `Content-Type: multipart/alternative; boundary="${alt}"`, '', body, ...files, `--${mixed}--`, ''].join('\r\n');
}
//# sourceMappingURL=mime.js.map