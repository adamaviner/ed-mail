import type { MailConfig } from '../../core/config.js';
import type { UploadImage } from '../editor/RichTextEditor.js';
import type { ExtraEmailRow, KindKey, MailAdminBase, PreviewRenderers } from '../types.js';
import type { RefLink } from './MessageDialog.js';
export type MailAdminTab = 'emails' | 'senders' | 'log';
export interface MailAdminPageProps<C extends MailConfig> extends MailAdminBase<C> {
    tab: MailAdminTab;
    onTabChange: (tab: MailAdminTab) => void;
    /** The kind whose wording is open (null: the list). Pass it with onEditKindChange to keep it in the URL; else the page keeps it. */
    editKind?: KindKey<C> | null;
    onEditKindChange?: (kind: KindKey<C> | null) => void;
    /** Puts an image somewhere public and returns its address, for the letter editor. */
    uploadImage?: UploadImage;
    /** A link to what an email is about, in the log's detail view; for 'rebuild' kinds it is the way to send again. */
    refLink?: RefLink;
    /** Previews for kinds that need more than their sample values. */
    previews?: PreviewRenderers<C>;
    /** The app's own rows on the Emails tab. */
    extraRows?: readonly ExtraEmailRow[];
    /** False for staff: only the log, without bodies, Resend or settings. Admin-only queries aren't called. */
    showBodies?: boolean;
    /** Shown at the top, e.g. how a Google sign-in went (the app reads its return address). */
    notice?: {
        ok: boolean;
        text: string;
    } | null;
    /** Told when the open letter gets or loses unsaved changes, so the app can stop its router leaving. */
    onDirtyChange?: (dirty: boolean) => void;
}
export declare function MailAdminPage<C extends MailConfig>(props: MailAdminPageProps<C>): import("react").JSX.Element;
//# sourceMappingURL=MailAdminPage.d.ts.map