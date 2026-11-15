import { emailShell, htmlToText } from './emailHtml.js';
import { fillTemplate, unknownPlaceholders } from './template.js';
/** The spec's placeholder keys, and which of them are blocks. */
export function specKeys(spec) {
    return { known: new Set(spec.placeholders.map((p) => p.key)), blocks: new Set(spec.placeholders.filter((p) => p.block).map((p) => p.key)) };
}
/** Fills `letter` (the kind's saved or built-in wording) with `values`, in the email's frame. */
export function renderText(spec, letter, values, opts = {}) {
    const { known, blocks } = specKeys(spec);
    const filled = fillTemplate({ subject: letter.subject, body: letter.body, values: { ...values }, known, blocks, marked: opts.marked, dropParagraph: spec.dropParagraph });
    // A dropped paragraph leaves its line empty.
    const body = filled.body.replace(/\n{2,}/g, '\n');
    return { subject: filled.subject, html: emailShell(body), text: htmlToText(body), unknown: unknownPlaceholders(letter, known) };
}
//# sourceMappingURL=render.js.map