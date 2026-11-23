// Small text helpers every app and every part of the library uses.
/** Loose on purpose: catches typos like a missing @ or dot, and leaves the rest to the mail server. */
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(value) {
    return EMAIL.test(value.trim());
}
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapes text for HTML, quotes included, so it is safe in attributes too. */
export function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
/** Plain text as HTML paragraphs: blank lines split paragraphs, single line breaks stay. */
export function textToHtml(text) {
    return text
        .replace(/\r\n?/g, '\n')
        .trim()
        .split(/\n{2,}/)
        .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, '<br>\n')}</p>`)
        .join('\n');
}
//# sourceMappingURL=text.js.map