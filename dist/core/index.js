// Pure helpers with no Convex or React imports, so they run in Convex functions and the browser.
/** Loose on purpose: catches typos like a missing @ or dot, and leaves the rest to the mail server. */
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(value) {
    return EMAIL.test(value.trim());
}
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
//# sourceMappingURL=index.js.map