/** A {word} in a template. Braces with spaces in them (CSS rules in a <style>) aren't placeholders. */
export declare const PLACEHOLDER: RegExp;
/** How an empty fill-in shows in the preview: its {placeholder} on a yellow mark. */
export declare const EMPTY_STYLE = "background:#fdf0c2;color:#7a5b00;border-radius:3px;padding:0 2px";
export interface Letter {
    subject: string;
    body: string;
}
/** Every placeholder in the subject and body, each once, in order. */
export declare function placeholdersIn(t: Letter): string[];
/** Placeholders the template uses that aren't in `known` (typos), each once, in order. */
export declare function unknownPlaceholders(t: Letter, known: ReadonlySet<string>): string[];
/** Required placeholders the template leaves out (a letter with a personal link must keep the link). */
export declare function missingPlaceholders(t: Letter, required: readonly string[]): string[];
/**
 * The body as email HTML. Plain text (no block tags) gets paragraphs and line breaks, the way
 * WordPress's wpautop does; HTML is left as it is.
 */
export declare function bodyHtml(body: string): string;
export interface FillOptions {
    subject: string;
    body: string;
    /** Every placeholder's value, by key. */
    values: Record<string, string>;
    /** The keys the template may use; others stay as typed. */
    known: ReadonlySet<string>;
    /** Placeholders whose value is HTML blocks (a list, a table), not text. */
    blocks?: ReadonlySet<string>;
    /** Fill-ins to mark in the preview (data-fill), showing an empty one as its {placeholder}. */
    marked?: (key: string) => boolean;
    /** Placeholders whose paragraph goes when they're empty (unless marked). */
    dropParagraph?: readonly string[];
}
/**
 * Fills {placeholders} into the body, where text values are escaped, and into the subject, which is
 * plain text. Returns the body HTML, not yet in its frame (emailShell).
 */
export declare function fillTemplate(o: FillOptions): Letter;
//# sourceMappingURL=template.d.ts.map