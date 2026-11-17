import type { MailConfig } from '../../core/config.js';
import type { ExtraEmailRow, MailAdminBase } from '../types.js';
export declare function EmailsTab<C extends MailConfig>({ api, auth, config, extraRows, onEdit }: MailAdminBase<C> & {
    extraRows?: readonly ExtraEmailRow[];
    onEdit: (kind: string) => void;
}): import("react").JSX.Element;
//# sourceMappingURL=EmailsTab.d.ts.map