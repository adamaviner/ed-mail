import type { TextSpec } from './config.js';
import { type Letter } from './template.js';
export interface RenderedText {
    subject: string;
    /** The whole email: styled inline, in its frame. */
    html: string;
    /** The same as plain text, sent alongside. */
    text: string;
    /** Placeholders left in as typed because the kind doesn't know them. */
    unknown: string[];
}
export interface RenderOptions {
    /** Fill-ins to mark in a preview (data-fill), showing an empty one as its {placeholder}. */
    marked?: (key: string) => boolean;
}
/** The spec's placeholder keys, and which of them are blocks. */
export declare function specKeys(spec: TextSpec): {
    known: ReadonlySet<string>;
    blocks: ReadonlySet<string>;
};
/** Fills `letter` (the kind's saved or built-in wording) with `values`, in the email's frame. */
export declare function renderText(spec: TextSpec, letter: Letter, values: Readonly<Record<string, string>>, opts?: RenderOptions): RenderedText;
//# sourceMappingURL=render.d.ts.map