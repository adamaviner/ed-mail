import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Admin → Email: every email the app sends and its wording (Emails), the Google accounts that send
// them (Senders), and the log (Sent & failed). The app owns the URL: it passes the tab, and
// optionally the letter being edited, and hears when they change.
import { useQuery } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import { useRef, useState } from 'react';
import { LetterEditor } from '../letter/LetterEditor.js';
import { Button } from '../ui/button.js';
import { ErrorNote, Note } from '../ui/notes.js';
import { Tabs } from '../ui/tabs.js';
import { EmailsTab } from './EmailsTab.js';
import { kindTitle } from './format.js';
import { MailLog } from './MailLog.js';
import { SendersTab } from './SendersTab.js';
const LEAVE = 'This letter has unsaved changes. Leave without saving them?';
export function MailAdminPage(props) {
    const { api, auth, config, tab, showBodies = true, notice } = props;
    if (!showBodies)
        return _jsx(MailLog, { api: api, auth: auth, config: config, showBodies: false, refLink: props.refLink });
    return (_jsxs("div", { className: "space-y-4", children: [notice && (notice.ok ? _jsx(Note, { children: notice.text }) : _jsx(ErrorNote, { error: notice.text })), _jsx(AdminTabs, { ...props }), tab === 'log' && _jsx(MailLog, { api: api, auth: auth, config: config, refLink: props.refLink })] }));
}
function AdminTabs({ api, auth, config, tab, onTabChange, editKind, onEditKindChange, uploadImage, previews, extraRows, onDirtyChange }) {
    const failures = useQuery(api.failureCount, { auth });
    const [ownKind, setOwnKind] = useState(null);
    const controlled = editKind !== undefined;
    const open = controlled ? editKind : ownKind;
    const dirty = useRef(false);
    /** Runs a move away from the open letter, after asking when it has unsaved changes. */
    const leave = (go) => {
        if (dirty.current && !window.confirm(LEAVE))
            return;
        dirty.current = false;
        go();
    };
    const setOpen = (kind) => (controlled ? onEditKindChange?.(kind) : setOwnKind(kind));
    const tabs = [
        { value: 'emails', label: 'Emails' },
        { value: 'senders', label: 'Senders' },
        {
            value: 'log',
            label: (_jsxs(_Fragment, { children: ["Sent & failed", !!failures && _jsx("span", { className: "rounded-full bg-destructive/10 px-1.5 text-xs text-destructive", children: failures >= 100 ? '100+' : failures })] })),
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsx(Tabs, { label: "Email", value: tab, tabs: tabs, onChange: (t) => leave(() => onTabChange(t)) }), tab === 'emails' &&
                (open ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "ghost", onClick: () => leave(() => setOpen(null)), children: [_jsx(ArrowLeft, {}), " All emails"] }), _jsx("h2", { className: "text-base font-medium", children: kindTitle(config, open) })] }), _jsx(LetterEditor, { api: api, auth: auth, config: config, kind: open, uploadImage: uploadImage, preview: previews?.[open], onChangeSender: () => leave(() => onTabChange('senders')), onDirtyChange: (d) => {
                                dirty.current = d;
                                onDirtyChange?.(d);
                            } }, open)] })) : (_jsx(EmailsTab, { api: api, auth: auth, config: config, extraRows: extraRows, onEdit: (kind) => setOpen(kind) }))), tab === 'senders' && _jsx(SendersTab, { api: api, auth: auth, config: config })] }));
}
//# sourceMappingURL=MailAdminPage.js.map