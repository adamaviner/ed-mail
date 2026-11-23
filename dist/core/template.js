// Letters with {placeholders}: filling them in, and checking a template before it is saved.
// Pure string work, so the browser preview and the sent email come from the same code.
import { escapeHtml } from './text.js';
/** A {word} in a template. Braces with spaces in them (CSS rules in a <style>) aren't placeholders. */
export const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;
/** How an empty fill-in shows in the preview: its {placeholder} on a yellow mark. */
export const EMPTY_STYLE = 'background:#fdf0c2;color:#7a5b00;border-radius:3px;padding:0 2px';
/** Every placeholder in the subject and body, each once, in order. */
export function placeholdersIn(t) {
    const out = [];
    for (const text of [t.subject, t.body]) {
        for (const [, key] of text.matchAll(PLACEHOLDER))
            if (!out.includes(key))
                out.push(key);
    }
    return out;
}
/** Placeholders the template uses that aren't in `known` (typos), each once, in order. */
export function unknownPlaceholders(t, known) {
    return placeholdersIn(t).filter((key) => !known.has(key));
}
/** Required placeholders the template leaves out (a letter with a personal link must keep the link). */
export function missingPlaceholders(t, required) {
    const used = new Set(placeholdersIn(t));
    return required.filter((key) => !used.has(key));
}
const BLOCK_TAG = /<(p|div|br|ul|ol|li|h[1-6]|table|blockquote|hr)\b/i;
/**
 * The body as email HTML. Plain text (no block tags) gets paragraphs and line breaks, the way
 * WordPress's wpautop does; HTML is left as it is.
 */
export function bodyHtml(body) {
    const text = body.replace(/\r\n?/g, '\n').trim();
    if (!text || BLOCK_TAG.test(text))
        return text;
    return text
        .split(/\n{2,}/)
        .map((para) => `<p>${para.trim().replace(/\n/g, '<br>\n')}</p>`)
        .join('\n');
}
/**
 * Fills {placeholders} into the body, where text values are escaped, and into the subject, which is
 * plain text. Returns the body HTML, not yet in its frame (emailShell).
 */
export function fillTemplate(o) {
    const { values, known } = o;
    const BLOCKS = o.blocks ?? new Set();
    const marked = (key) => !!o.marked?.(key);
    const value = (key, escape) => {
        const v = values[key] ?? '';
        // Typed text keeps its line breaks.
        const html = escape && !BLOCKS.has(key) ? escapeHtml(v).replace(/\r?\n/g, '<br>') : v;
        if (!escape || !marked(key))
            return html;
        return v ? `<span data-fill="${key}">${html}</span>` : `<span data-fill="${key}" style="${EMPTY_STYLE}">{${key}}</span>`;
    };
    const block = (key) => {
        if (!marked(key))
            return value(key, false);
        const v = values[key] ?? '';
        return v ? `<div data-fill="${key}">${v}</div>` : `<p data-fill="${key}"><span style="${EMPTY_STYLE}">{${key}}</span></p>`;
    };
    const fill = (text, escape) => text.replace(PLACEHOLDER, (whole, key) => (known.has(key) ? value(key, escape) : whole));
    // Inside a tag (an href) a value is only escaped: a preview's marking there would break the tag.
    const inTag = (tag) => tag.replace(PLACEHOLDER, (whole, key) => (known.has(key) ? escapeHtml(values[key] ?? '') : whole));
    const fillBody = (html) => html.replace(/<[^>]*>|[^<]+/g, (chunk) => (chunk.startsWith('<') ? inTag(chunk) : fill(chunk, true)));
    let html = bodyHtml(o.body);
    // The preview keeps an empty fill-in's paragraph, to show what's left to fill in.
    for (const key of o.dropParagraph ?? []) {
        if (!marked(key) && !values[key])
            html = html.replace(new RegExp(`<p\\b[^>]*>(?:(?!</p>)[\\s\\S])*\\{${key}\\}(?:(?!</p>)[\\s\\S])*</p>`, 'g'), '');
    }
    // A block alone in its paragraph replaces the paragraph (a list can't sit inside a <p>), and an empty one leaves nothing.
    const blocks = html.replace(/<p(?:\s[^>]*)?>\s*\{([a-z_]+)\}\s*<\/p>/g, (whole, key) => (BLOCKS.has(key) ? block(key) : whole));
    return {
        // The subject is plain text: no escaping, and no line breaks.
        subject: fill(o.subject, false).replace(/\s+/g, ' ').trim(),
        body: fillBody(blocks),
    };
}
//# sourceMappingURL=template.js.map