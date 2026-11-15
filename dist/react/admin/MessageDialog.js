import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// One email from the log: who, what, when, what happened. For admins (showBodies) also the body as
// it went out, and Resend: the stored copy for plain emails, or for emails made afresh each time
// (a link that can expire, a status that can change) the app's link to the thing it belongs to.
import { useMutation, useQuery } from 'convex/react';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { LetterPreview } from '../letter/LetterPreview.js';
import { MailStatus } from '../MailStatus.js';
import { Button } from '../ui/button.js';
import { Dialog } from '../ui/dialog.js';
import { ErrorNote } from '../ui/notes.js';
import { useSaver } from '../useSaver.js';
import { dateTime, kindsOf, kindTitle, senderTitle } from './format.js';
export function MessageDialog({ api, auth, config, message: m, showBodies, refLink, onClose, }) {
    const spec = kindsOf(config)[m.kind];
    const link = m.ref && refLink ? refLink(m.ref, m) : null;
    const facts = [
        ['To', [...m.to, ...m.cc.map((a) => `${a} (cc)`)].join(', ')],
        ['Email', kindTitle(config, m.kind)],
        ['From', senderTitle(config, m.senderKey)],
        ['Queued', `${dateTime(m.createdAt)}${m.by ? ` by ${m.by}` : ''}`],
        ...(m.sentAt ? [['Sent', dateTime(m.sentAt)]] : []),
        ...(m.nextAttemptAt ? [['Next try', dateTime(m.nextAttemptAt)]] : []),
        ['Tries', String(m.attempts)],
        ...(m.attachments.length || m.files.length ? [['Attached', [...m.attachments, ...m.files.map((f) => f.filename)].join(', ')]] : []),
        ...(m.replyTo ? [['Replies to', m.replyTo]] : []),
        ...(link ? [['About', link]] : []),
    ];
    return (_jsx(Dialog, { open: true, onOpenChange: (open) => !open && onClose(), title: m.subject || '(no subject)', className: "sm:max-w-3xl", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(MailStatus, { status: m.status }), m.error && _jsx("span", { className: "text-sm text-destructive", children: m.error })] }), _jsx("dl", { className: "grid grid-cols-[auto_1fr] gap-x-4 gap-y-1", children: facts.map(([label, value]) => (_jsxs("div", { className: "contents", children: [_jsx("dt", { className: "text-muted-foreground", children: label }), _jsx("dd", { className: "min-w-0 break-words", children: value })] }, label))) }), showBodies && _jsx(Resend, { api: api, auth: auth, config: config, message: m, rebuild: spec?.resend === 'rebuild', link: link }), showBodies && _jsx(Body, { api: api, auth: auth, config: config, id: m.id })] }) }));
}
function Resend({ api, auth, message: m, rebuild, link }) {
    const resend = useMutation(api.resend);
    const saver = useSaver('It wasn’t queued again.');
    const [queued, setQueued] = useState(false);
    if (m.status === 'queued' || m.status === 'sending')
        return null;
    if (rebuild) {
        return _jsxs("p", { className: "text-sm text-muted-foreground", children: ["This email is made afresh each time, so send it again from where it belongs", link ? _jsxs(_Fragment, { children: [": ", link] }) : ' in the app', "."] });
    }
    if (m.files.length)
        return _jsx("p", { className: "text-sm text-muted-foreground", children: "Its attached files weren\u2019t kept, so it can\u2019t be sent again from here." });
    return (_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs(Button, { variant: "outline", disabled: saver.busy || queued, onClick: () => void saver.save(async () => {
                    await resend({ auth, id: m.id });
                    setQueued(true);
                }), children: [_jsx(Send, {}), " Resend this copy"] }), queued && _jsx("span", { className: "text-sm text-primary", children: "Queued again; it shows at the top of the log." }), _jsx(ErrorNote, { error: saver.error, compact: true })] }));
}
/** The body as it went out. Only mounted for admins, so the staff list never asks for bodies. */
function Body({ api, auth, id }) {
    const full = useQuery(api.message, { auth, id });
    if (full === undefined)
        return _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading the email\u2026" });
    if (full === null)
        return _jsx("p", { className: "text-sm text-muted-foreground", children: "This email is no longer in the log." });
    return _jsx(LetterPreview, { html: full.html, title: "The email as sent", className: "h-[50vh]" });
}
//# sourceMappingURL=MessageDialog.js.map