/** Loose on purpose: catches typos like a missing @ or dot, and leaves the rest to the mail server. */
export declare const EMAIL: RegExp;
export declare function isEmail(value: string): boolean;
/** Escapes text for HTML, quotes included, so it is safe in attributes too. */
export declare function escapeHtml(text: string): string;
/** Plain text as HTML paragraphs: blank lines split paragraphs, single line breaks stay. */
export declare function textToHtml(text: string): string;
//# sourceMappingURL=text.d.ts.map