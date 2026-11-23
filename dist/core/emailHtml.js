// Turns a letter's body HTML into what goes out: every tag the editor makes styled inline (email
// clients drop stylesheets), images no wider than the column, the whole thing in a column that
// Outlook lays out too, and a plain-text version for clients (and spam filters) that want one.
// No colours are set except borders, so a client in dark mode recolours the letter as it does a
// personal email (a forced white background showed as a white box in Apple Mail's dark mode). Pure string work, so it runs the same in Convex mutations and the browser preview.
// Imported from convex/ too, so no path aliases here.
/** The column's width; images are capped to it. */
export const EMAIL_WIDTH = 600;
const FONT = 'Helvetica,Arial,sans-serif';
/** Inline styles for each tag the editor produces. A tag's own style (text-align) comes after, so it wins. */
const TAG_STYLES = {
    p: 'margin:0 0 16px',
    h1: 'margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:bold',
    h2: 'margin:24px 0 12px;font-size:21px;line-height:1.3;font-weight:bold',
    h3: 'margin:20px 0 8px;font-size:18px;line-height:1.3;font-weight:bold',
    ul: 'margin:0 0 16px;padding-left:24px',
    ol: 'margin:0 0 16px;padding-left:24px',
    li: 'margin:0 0 4px',
    a: 'text-decoration:underline',
    blockquote: 'margin:0 0 16px;padding-left:12px;border-left:3px solid #cccccc',
    hr: 'border:0;border-top:1px solid #dddddd;margin:24px 0',
    img: 'display:block;max-width:100%;height:auto;border:0;margin:0 0 16px',
};
const STYLED_TAG = new RegExp(`<(${Object.keys(TAG_STYLES).join('|')})\\b([^>]*?)(\\s*/?)>`, 'gi');
const STYLE_ATTR = /\sstyle\s*=\s*"([^"]*)"/i;
/** Adds the default inline style to each known tag, keeping any style it already has (after ours). */
export function inlineStyles(html) {
    return html.replace(STYLED_TAG, (_whole, tag, attrs, close) => {
        const base = TAG_STYLES[tag.toLowerCase()];
        const own = STYLE_ATTR.exec(attrs);
        const rest = own ? attrs.replace(STYLE_ATTR, '') : attrs;
        const style = own ? `${base};${own[1].trim().replace(/;$/, '')}` : base;
        return `<${tag}${rest} style="${style}"${close.includes('/') ? ' /' : ''}>`;
    });
}
/** A list item holding one paragraph (how the editor writes them), so it can lose the paragraph's spacing. */
const LIST_ITEM_PARAGRAPH = /<li([^>]*)>\s*<p(?:\s[^>]*)?>((?:(?!<\/?p\b)[\s\S])*?)<\/p>\s*<\/li>/gi;
/** `<li><p>text</p></li>` as `<li>text</li>`, so list items aren't a paragraph apart. */
export const unwrapListParagraphs = (html) => html.replace(LIST_ITEM_PARAGRAPH, '<li$1>$2</li>');
/** Images wider than the column are set to its width (Outlook goes by the attribute), height left to scale. */
export function capImageWidths(html) {
    return html.replace(/<img\b[^>]*>/gi, (img) => {
        const m = /\swidth\s*=\s*"?(\d+)"?/i.exec(img);
        if (!m || Number(m[1]) <= EMAIL_WIDTH)
            return img;
        return img.replace(m[0], ` width="${EMAIL_WIDTH}"`).replace(/\sheight\s*=\s*"?\d+"?/i, '');
    });
}
/**
 * The body, styled, in a left-aligned column at most 600px wide, like a letter typed in Gmail, with
 * a fixed-width table only Outlook reads. 16px text: 15px read small on phones.
 */
export function emailShell(html) {
    const body = inlineStyles(capImageWidths(unwrapListParagraphs(html)));
    return [
        `<!--[if mso]><table role="presentation" width="${EMAIL_WIDTH}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->`,
        `<div style="max-width:${EMAIL_WIDTH}px;text-align:left;font-family:${FONT};font-size:16px;line-height:1.5">`,
        body,
        '</div>',
        '<!--[if mso]></td></tr></table><![endif]-->',
    ].join('\n');
}
/**
 * The HTML as a whole document, as it is sent. Mail apps that show email in a web view (Thunderbird
 * on Android) lay out a bare fragment at desktop width and shrink it, so the text came out small;
 * the viewport line stops that. `color-scheme` tells Apple Mail the letter is fine in dark mode.
 * HTML that is already a document is left alone.
 */
export function emailDocument(html) {
    if (/^\s*(<!doctype|<html)/i.test(html))
        return html;
    return [
        '<!doctype html>',
        '<html>',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<meta name="color-scheme" content="light dark">',
        '<meta name="supported-color-schemes" content="light dark">',
        '</head>',
        '<body>',
        html,
        '</body>',
        '</html>',
    ].join('\n');
}
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, name) => {
    if (name[0] === '#') {
        const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
});
/** The body HTML as plain text: paragraphs as blank-line breaks, list items as "- ", links as "text (address)". */
export function htmlToText(html) {
    return decode(html
        .replace(/<(style|script|head)\b[\s\S]*?<\/\1>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s*\n\s*/g, ' ')
        .replace(/<a\b[^>]*\shref\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_w, href, inner) => {
        const text = inner.replace(/<[^>]+>/g, '').trim();
        return !text || text === href || href.startsWith('mailto:') ? text || href : `${text} (${href})`;
    })
        .replace(/<img\b[^>]*\salt\s*=\s*"([^"]+)"[^>]*>/gi, '[$1]')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<hr\b[^>]*>/gi, '\n\n---\n\n')
        .replace(/<li\b[^>]*>/gi, '\n- ')
        .replace(/<\/(p|div|h[1-6]|blockquote|ul|ol|table|tr)>/gi, '\n\n')
        .replace(/<[^>]+>/g, ''))
        .replace(/[ \t]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
/** Problems with hand-written HTML that email clients won't show as intended, for the HTML editor. */
export function emailHtmlWarnings(html) {
    const out = [];
    if (/<script\b/i.test(html))
        out.push('Scripts don’t run in email; remove the <script>.');
    if (/<link\b[^>]*stylesheet/i.test(html))
        out.push('Email clients don’t load stylesheets; style tags inline (style="…").');
    if (/<style\b/i.test(html))
        out.push('Many email clients (Gmail on phones, Outlook) ignore <style> blocks; style tags inline instead.');
    if (/<img\b[^>]*\ssrc\s*=\s*"data:/i.test(html))
        out.push('Images pasted in as data are blocked by Gmail; upload the image instead.');
    if (/<img\b[^>]*\ssrc\s*=\s*"(?!https?:|\{)/i.test(html))
        out.push('An image has a relative address; images need a full https:// address.');
    if (/<(form|input|button|iframe|video|audio)\b/i.test(html))
        out.push('Forms, buttons, iframes and video don’t work in most email clients.');
    return out;
}
//# sourceMappingURL=emailHtml.js.map