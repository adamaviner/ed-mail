import type { MailConfig } from '../../core/config.js';
import type { UploadImage } from '../editor/RichTextEditor.js';
import type { KindKey, MailAdminBase } from '../types.js';
import { type PreviewRenderer } from './preview.js';
export interface LetterEditorProps<C extends MailConfig> extends MailAdminBase<C> {
    kind: KindKey<C>;
    /** Puts an image somewhere public and returns its address. Without it the editor has no image button. */
    uploadImage?: UploadImage;
    /** How the preview (and "Send test to me") renders this kind; default: its sample values filled in. */
    preview?: PreviewRenderer;
    /** The "change" link beside the sender (e.g. to the Senders tab). Without it there's no link. */
    onChangeSender?: () => void;
    /** Told when the letter gets or loses unsaved changes, so the app can stop its router leaving. */
    onDirtyChange?: (dirty: boolean) => void;
}
export declare function LetterEditor<C extends MailConfig>(props: LetterEditorProps<C>): import("react").JSX.Element;
//# sourceMappingURL=LetterEditor.d.ts.map