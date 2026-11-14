import { type KindSpec } from '../../core/config.js';
import { type Letter } from '../../core/template.js';
export declare const sameLetter: (a: Letter, b: Letter) => boolean;
/**
 * The fields once the saved letter changes from `before` to `after` (a save or reset here, or
 * another admin's): untouched fields follow it, edits stay.
 */
export declare function followSaved(fields: Letter, before: Letter, after: Letter): Letter;
/** `text` put in place of value[start, end). */
export declare const spliceText: (value: string, start: number, end: number, text: string) => string;
export interface PlaceholderCheck {
    /** Placeholders the kind doesn't have (typos): they'd go out as typed. */
    unknown: string[];
    /** Placeholders the kind requires that the letter leaves out. */
    missing: string[];
}
export declare function checkPlaceholders(spec: KindSpec, letter: Letter): PlaceholderCheck;
/** Why Save can't run now, or null when it can. Placeholder problems point at their notes, which say more. */
export declare function saveBlocker(spec: KindSpec, fields: Letter, dirty: boolean): string | null;
/** The line beside the buttons: unsaved, saved by whom and when, or the built-in wording. */
export declare function statusText(o: {
    dirty: boolean;
    custom: boolean;
    updatedBy: string | null;
    updatedAt: number | null;
}): string;
//# sourceMappingURL=letterState.d.ts.map