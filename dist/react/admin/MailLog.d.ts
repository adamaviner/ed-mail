import type { MailConfig } from '../../core/config.js';
import type { MailAdminBase } from '../types.js';
import { type RefLink } from './MessageDialog.js';
export interface MailLogProps<C extends MailConfig> extends MailAdminBase<C> {
    /** False for staff: the list only, no body, no Resend, no settings. */
    showBodies?: boolean;
    /** A link to what an email is about (an application, a registration), for the detail view. */
    refLink?: RefLink;
    pageSize?: number;
}
export declare function MailLog<C extends MailConfig>({ api, auth, config, showBodies, refLink, pageSize }: MailLogProps<C>): import("react").JSX.Element;
//# sourceMappingURL=MailLog.d.ts.map