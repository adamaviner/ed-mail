// HTML from the rich text editor, cut down to what the editor makes, for text staff write that the
// app shows as HTML on its own pages (where a script would run with the viewer's login). Every tag
// is rebuilt from an allow list: a known tag keeps only its known attributes, anything else
// (scripts, comments, event handlers, javascript: links) is shown as text. Pure; convex/ imports it.

const TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'img'])
const URL_OK = /^(https?:\/\/|mailto:)/i
// A letter's link to a placeholder (`href="{registration_link}"`), filled with the app's own URL when sent.
const PLACEHOLDER = /^\{[a-z_]+\}$/

/** Whether an attribute may stay on this tag, with this value. */
function keep(tag: string, name: string, value: string): boolean {
  if (name === 'style') return /^\s*text-align:\s*(left|center);?\s*$/i.test(value)
  if (tag === 'a') return (name === 'href' && (URL_OK.test(value.trim()) || PLACEHOLDER.test(value))) || (name === 'target' && value === '_blank') || (name === 'rel' && /^[a-z ]*$/i.test(value))
  if (tag === 'img') return (name === 'src' && /^https?:\/\//i.test(value.trim())) || name === 'alt' || ((name === 'width' || name === 'height') && /^\d{1,4}$/.test(value))
  return false
}

const escapeText = (s: string) =>
  s
    .replace(/&(?![a-z0-9#]+;)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const ATTR = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

function tag(raw: string): string {
  const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^]*?)\/?>$/.exec(raw)
  const name = m?.[2].toLowerCase()
  if (!m || !name || !TAGS.has(name)) return escapeText(raw)
  if (m[1]) return `</${name}>`
  const attrs = [...m[3].matchAll(ATTR)]
    .map(([, a, d, s]) => [a.toLowerCase(), d ?? s ?? ''] as const)
    .filter(([a, value]) => keep(name, a, value))
    .map(([a, value]) => ` ${a}="${escapeAttr(value)}"`)
  return `<${name}${attrs.join('')}>`
}

/** The HTML with only the editor's own tags and attributes left; everything else as text. */
export function safeHtml(html: string): string {
  return html.replace(/<[^>]*>|[^<]+|</g, (part) => (part.startsWith('<') ? (part === '<' ? '&lt;' : tag(part)) : escapeText(part)))
}
