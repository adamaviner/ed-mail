import { type Ref } from 'react';
import type { PlaceholderSpec } from '../../core/config.js';
import { type RichTextEditorHandle, type UploadImage } from './RichTextEditor.js';
export type RichEmailEditorHandle = RichTextEditorHandle;
/** `placeholders` usually come from the kind's text spec in the mail config (keep them stable between renders: the editor reads them once). */
export declare function RichEmailEditor({ placeholders, label, ...props }: {
    value: string;
    onChange: (html: string) => void;
    onFocus?: () => void;
    ref?: Ref<RichEmailEditorHandle>;
    placeholders: readonly PlaceholderSpec[];
    uploadImage?: UploadImage;
    label?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=RichEmailEditor.d.ts.map