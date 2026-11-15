/** The column's width; images are capped to it. */
export declare const EMAIL_WIDTH = 600;
/** Adds the default inline style to each known tag, keeping any style it already has (after ours). */
export declare function inlineStyles(html: string): string;
/** `<li><p>text</p></li>` as `<li>text</li>`, so list items aren't a paragraph apart. */
export declare const unwrapListParagraphs: (html: string) => string;
/** Images wider than the column are set to its width (Outlook goes by the attribute), height left to scale. */
export declare function capImageWidths(html: string): string;
/**
 * The body, styled, inside the email's frame: a centered column at most 600px wide on a white
 * background (set explicitly, for dark-mode clients), with a fixed-width table only Outlook reads.
 */
export declare function emailShell(html: string): string;
/** The body HTML as plain text: paragraphs as blank-line breaks, list items as "- ", links as "text (address)". */
export declare function htmlToText(html: string): string;
/** Problems with hand-written HTML that email clients won't show as intended, for the HTML editor. */
export declare function emailHtmlWarnings(html: string): string[];
//# sourceMappingURL=emailHtml.d.ts.map