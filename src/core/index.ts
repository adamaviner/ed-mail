// Pure helpers with no Convex or React imports, so they run in Convex functions and the browser.

/** Loose on purpose: catches typos like a missing @ or dot, and leaves the rest to the mail server. */
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim())
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
}
