import type { Letter } from '../../core/template.js';
import type { RichTextEditorHandle } from '../editor/RichTextEditor.js';
export type LetterField = 'subject' | 'body';
/**
 * A letter's subject and body while they're edited, against the saved letter: whether they differ
 * (dirty), going back to it (undo), and putting a {placeholder} where the cursor was in whichever
 * field was used last. When the saved letter changes (a save, a reset, another admin), untouched
 * fields follow it and edits stay. Spread `subjectProps` on the subject input and `bodyProps` on
 * the RichEmailEditor.
 */
export declare function useLetterFields(saved: Letter, o?: {
    hasSubject?: boolean;
}): {
    subject: string;
    body: string;
    letter: Letter;
    setSubject: (subject: string) => void;
    setBody: (body: string) => void;
    /** Replaces both fields, e.g. with what a save stored or the built-in wording. */
    set: import("react").Dispatch<import("react").SetStateAction<Letter>>;
    dirty: boolean;
    /** Back to the saved letter. */
    undo: () => void;
    insert: (key: string) => void;
    lastField: import("react").RefObject<LetterField>;
    subjectProps: {
        ref: import("react").RefObject<HTMLInputElement | null>;
        value: string;
        onChange: (e: {
            target: {
                value: string;
            };
        }) => void;
        onFocus: () => string;
    };
    bodyProps: {
        ref: import("react").RefObject<RichTextEditorHandle | null>;
        value: string;
        onChange: (body: string) => void;
        onFocus: () => string;
    };
};
//# sourceMappingURL=useLetterFields.d.ts.map