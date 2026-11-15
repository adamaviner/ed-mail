import { type Ref } from 'react';
export interface RichTextEditorHandle {
    /** Puts text where the cursor is (or was), in whichever view is showing. */
    insert: (text: string) => void;
}
export type HeadingLevel = 2 | 3 | 4;
/** Uploads an image and returns its address, or throws a message to show. */
export type UploadImage = (file: File) => Promise<string>;
/** What differs between the places the editor is used. Fixed for an editor's life. */
export interface RichTextOptions {
    /** Placeholders the app knows; others show in red. */
    placeholders: ReadonlySet<string>;
    /** Placeholders that stand for whole paragraphs, lists or tables: shown as dashed chips. */
    blockPlaceholders?: ReadonlySet<string>;
    /** The two heading levels the toolbar offers: heading and subheading. */
    headings: readonly [HeadingLevel, HeadingLevel];
    /** A saved value as the editor's HTML (plain text from before the editor becomes paragraphs). */
    toHtml: (value: string) => string;
    /** Problems with the HTML, shown under the HTML view. */
    warnings?: (html: string) => string[];
    /** The widest an inserted image shows. */
    imageWidth: number;
    /** The editor's accessible name. */
    label: string;
}
export declare function RichTextEditor({ value, onChange, onFocus, ref, options, uploadImage, }: {
    value: string;
    onChange: (html: string) => void;
    onFocus?: () => void;
    ref?: Ref<RichTextEditorHandle>;
    options: RichTextOptions;
    uploadImage?: UploadImage;
}): import("react").JSX.Element;
//# sourceMappingURL=RichTextEditor.d.ts.map