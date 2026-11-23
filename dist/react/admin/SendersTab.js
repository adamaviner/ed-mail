import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// The sender lines: sign in to a Google account for each, choose the address, name and reply-to it
// sends with, send a test, retry what failed, disconnect. Until the deployment has a Google OAuth
// client, a card says how to make one.
import { useMutation, useQuery } from 'convex/react';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button.js';
import { ConfirmButton } from '../ui/ConfirmButton.js';
import { Field, Input } from '../ui/input.js';
import { ErrorNote } from '../ui/notes.js';
import { useSaver } from '../useSaver.js';
import { dateTime, kindsFrom } from './format.js';
export function SendersTab({ api, auth, config }) {
    const data = useQuery(api.senders, { auth });
    if (data === undefined)
        return _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading\u2026" });
    return (_jsxs("div", { className: "space-y-6", children: [!data.googleReady && _jsx(SetupCard, { redirectUri: data.redirectUri }), _jsxs("section", { className: "space-y-2", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Every email is listed under the account that sends it. Sign in with the Google account that should send each group. The app can only send as it (it can\u2019t read the mailbox). One account can send more than one group." }), _jsx("ul", { className: "divide-y rounded-lg border", children: data.senders.map((line) => (_jsx(SenderRow, { api: api, auth: auth, config: config, line: line, googleReady: data.googleReady }, line.key))) })] })] }));
}
function SenderRow({ api, auth, config, line, googleReady }) {
    const startConnect = useMutation(api.startConnect);
    const disconnect = useMutation(api.disconnect);
    const sendTest = useMutation(api.sendTest);
    const retryFailed = useMutation(api.retryFailed);
    const saver = useSaver();
    const [done, setDone] = useState(null);
    const { sender } = line;
    const sends = kindsFrom(config, line.key).filter(([, k]) => k.email !== false);
    const signIn = () => saver.save(async () => {
        const { url } = await startConnect({ auth, senderKey: line.key });
        window.location.assign(url);
    });
    const act = (fn) => void saver.save(async () => {
        setDone(null);
        setDone(await fn());
    });
    return (_jsxs("li", { className: "space-y-3 p-3", children: [_jsxs("div", { className: "flex flex-wrap items-start gap-3", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h3", { className: "text-sm font-medium", children: line.title }), sends.length ? (_jsx("ul", { className: "mt-0.5 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground", children: sends.map(([kind, k]) => (_jsxs("li", { children: [k.title, ": ", k.when] }, kind))) })) : (_jsx("p", { className: "text-sm text-muted-foreground", children: "Nothing is sent from here yet." })), sender ? (_jsxs("p", { className: "mt-1 text-sm", children: ["Sends as ", _jsx("span", { className: "font-medium", children: sender.fromEmail ?? sender.account }), sender.fromEmail && _jsxs("span", { className: "text-muted-foreground", children: [" (signed in as ", sender.account, ")"] }), sender.connectedBy && _jsxs("span", { className: "text-muted-foreground", children: [" \u00B7 connected by ", sender.connectedBy] })] })) : (_jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: sends.length ? 'Not connected: none of this is sent.' : 'Not connected.' }))] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [sender && (_jsx(Button, { variant: "outline", disabled: saver.busy, onClick: () => act(async () => {
                                    await sendTest({ auth, senderKey: line.key });
                                    return 'A test is on its way to your email address.';
                                }), children: "Send a test" })), sender && (_jsxs(Button, { variant: "outline", disabled: saver.busy, title: "Queues again what this line failed to send in the last week", onClick: () => act(async () => {
                                    const n = await retryFailed({ auth, senderKey: line.key });
                                    return n ? `Queued ${n} failed ${n === 1 ? 'email' : 'emails'} again.` : 'Nothing failed from this line in the last week.';
                                }), children: [_jsx(RefreshCw, {}), " Retry failed emails"] })), _jsx(Button, { variant: sender ? 'outline' : 'default', disabled: !googleReady || saver.busy, onClick: () => void signIn(), children: sender ? 'Use another account' : 'Sign in with Google' }), sender && (_jsx(ConfirmButton, { confirmLabel: "Stop sending this kind of email", disabled: saver.busy, onConfirm: () => saver.save(() => disconnect({ auth, senderKey: line.key })), children: "Disconnect" }))] })] }), done && _jsx("p", { className: "text-sm text-primary", children: done }), _jsx(ErrorNote, { error: saver.error }), sender?.lastError && _jsx(ErrorNote, { error: `Last failure (${dateTime(sender.lastErrorAt ?? 0)}): ${sender.lastError}` }), sender && _jsx(SenderOptions, { api: api, auth: auth, config: config, senderKey: line.key, sender: sender }, `${sender.account}:${sender.fromEmail}:${sender.fromName}:${sender.replyTo}`)] }));
}
function SenderOptions({ api, auth, senderKey, sender }) {
    const update = useMutation(api.updateSender);
    const saver = useSaver();
    const [form, setForm] = useState({ fromEmail: sender.fromEmail ?? '', fromName: sender.fromName ?? '', replyTo: sender.replyTo ?? '' });
    const changed = form.fromEmail !== (sender.fromEmail ?? '') || form.fromName !== (sender.fromName ?? '') || form.replyTo !== (sender.replyTo ?? '');
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
    const id = (k) => `mail-${senderKey}-${k}`;
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [_jsx(Field, { label: "Send as", htmlFor: id('from'), hint: "Blank: the account itself. Else one of its Gmail \u201CSend mail as\u201D addresses.", children: _jsx(Input, { id: id('from'), type: "email", placeholder: sender.account, value: form.fromEmail, onChange: set('fromEmail') }) }), _jsx(Field, { label: "From name", htmlFor: id('name'), hint: "Shown as the sender.", children: _jsx(Input, { id: id('name'), value: form.fromName, onChange: set('fromName') }) }), _jsx(Field, { label: "Replies go to", htmlFor: id('reply'), hint: "Blank: back to the sender.", children: _jsx(Input, { id: id('reply'), type: "email", value: form.replyTo, onChange: set('replyTo') }) })] }), _jsxs("div", { className: "flex items-center justify-end gap-3", children: [_jsx(ErrorNote, { error: saver.error, compact: true, className: "flex-1" }), _jsx(Button, { disabled: !changed || saver.busy, onClick: () => void saver.save(() => update({ auth, senderKey, ...form })), children: "Save" })] })] }));
}
/** Shown until the deployment has a Google OAuth client (the app's `google` option returns null). */
function SetupCard({ redirectUri }) {
    const code = 'rounded bg-muted px-1 text-xs break-all';
    return (_jsxs("section", { className: "space-y-2 rounded-lg border p-4", children: [_jsx("h3", { className: "text-sm font-medium", children: "Set up Google sign-in first" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "One time, in Google Cloud, with an account of the organisation\u2019s Google Workspace." }), _jsxs("ol", { className: "list-decimal space-y-1 pl-5 text-sm", children: [_jsx("li", { children: "Make (or pick) a Google Cloud project and turn on the Gmail API." }), _jsx("li", { children: "OAuth consent screen: user type Internal, so only the organisation\u2019s accounts can sign in." }), _jsxs("li", { children: ["Credentials \u2192 Create OAuth client ID \u2192 Web application, with this authorized redirect URI: ", _jsx("code", { className: code, children: redirectUri })] }), _jsxs("li", { children: ["Set its ID and secret on this Convex deployment where the app\u2019s mail setup reads them (usually ", _jsx("code", { className: code, children: "GOOGLE_CLIENT_ID" }), " and", ' ', _jsx("code", { className: code, children: "GOOGLE_CLIENT_SECRET" }), "), then reload this page."] })] })] }));
}
//# sourceMappingURL=SendersTab.js.map