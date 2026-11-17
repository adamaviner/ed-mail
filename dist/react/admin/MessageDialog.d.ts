import { type ReactNode } from 'react';
import type { MailConfig } from '../../core/config.js';
import type { MailAdminBase, MailMessage, MailRef } from '../types.js';
export type RefLink = (ref: MailRef, message: MailMessage) => ReactNode;
export declare function MessageDialog<C extends MailConfig>({ api, auth, config, message: m, showBodies, refLink, onClose, }: MailAdminBase<C> & {
    message: MailMessage;
    showBodies: boolean;
    refLink?: RefLink;
    onClose: () => void;
}): import("react").JSX.Element;
//# sourceMappingURL=MessageDialog.d.ts.map