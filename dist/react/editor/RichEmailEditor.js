import { jsx as _jsx } from "react/jsx-runtime";
// A letter's body editor: the formatted-text editor, limited to what email clients show well, with
// the letter's placeholders. The value is HTML; emailShell styles it inline when the email is built.
import { useMemo } from 'react';
import { EMAIL_WIDTH, emailHtmlWarnings } from '../../core/emailHtml.js';
import { bodyHtml } from '../../core/template.js';
import { RichTextEditor } from './RichTextEditor.js';
/** `placeholders` usually come from the kind's text spec in the mail config (keep them stable between renders: the editor reads them once). */
export function RichEmailEditor({ placeholders, label = 'Body', ...props }) {
    const options = useMemo(() => ({
        placeholders: new Set(placeholders.map((p) => p.key)),
        blockPlaceholders: new Set(placeholders.filter((p) => p.block).map((p) => p.key)),
        headings: [2, 3],
        toHtml: bodyHtml,
        warnings: emailHtmlWarnings,
        imageWidth: EMAIL_WIDTH,
        label,
    }), [placeholders, label]);
    return _jsx(RichTextEditor, { ...props, options: options });
}
//# sourceMappingURL=RichEmailEditor.js.map