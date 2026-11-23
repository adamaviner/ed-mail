/** The column's width; images are capped to it. */
export declare const EMAIL_WIDTH = 600;
/** Adds the default inline style to each known tag, keeping any style it already has (after ours). */
export declare function inlineStyles(html: string): string;
/** `<li><p>text</p></li>` as `<li>text</li>`, so list items aren't a paragraph apart. */
export declare const unwrapListParagraphs: (html: string) => string;
/** Images wider than the column are set to its width (Outlook goes by the attribute), height left to scale. */
export declare function capImageWidths(html: string): string;
/**
 * The body, styled, in a left-aligned column at most 600px wide, like a letter typed in Gmail, with
 * a fixed-width table only Outlook reads. 16px text: 15px read small on phones.
 */
export declare function emailShell(html: string): string;
/**
 * The HTML as a whole document, as it is sent. Mail apps that show email in a web view (Thunderbird
 * on Android) lay out a bare fragment at desktop width and shrink it, so the text came out small;
 * the viewport line stops that. `color-scheme` tells Apple Mail the letter is fine in dark mode.
 * HTML that is already a document is left alone.
 */
export declare function emailDocument(html: string): string;
/** The body HTML as plain text: paragraphs as blank-line breaks, list items as "- ", links as "text (address)". */
export declare function htmlToText(html: string): string;
/** Problems with hand-written HTML that email clients won't show as intended, for the HTML editor. */
export declare function emailHtmlWarnings(html: string): string[];
//# sourceMappingURL=emailHtml.d.ts.map