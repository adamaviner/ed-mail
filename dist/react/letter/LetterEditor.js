import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// An admin's editor for one kind's wording: subject and body with placeholder chips, notes that
// stop a save (unknown or missing placeholders), Save / Undo changes / Reset to built-in / Compare
// with built-in / Send test to me, which sender it goes out from, and a preview beside it.
import { useMutation, useQuery } from 'convex/react';
import { GitCompare, RotateCcw, Save, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RichEmailEditor } from '../editor/RichEmailEditor.js';
import { Button } from '../ui/button.js';
import { ConfirmButton } from '../ui/ConfirmButton.js';
import { Input } from '../ui/input.js';
import { ErrorNote, Note } from '../ui/notes.js';
import { useSaver } from '../useSaver.js';
import { CompareDialog } from './CompareDialog.js';
import { checkPlaceholders, sameLetter, saveBlocker, statusText } from './letterState.js';
import { LetterPreview } from './LetterPreview.js';
import { PlaceholderChips, PlaceholderNotes } from './parts.js';
import { defaultPreview } from './preview.js';
import { useLetterFields } from './useLetterFields.js';
import { useUnsavedWarning } from './useUnsavedWarning.js';
export function LetterEditor(props) {
    const { api, auth, config, kind } = props;
    const texts = useQuery(api.texts, { auth });
    const senders = useQuery(api.senders, { auth });
    const spec = config.kinds[kind];
    if (texts === undefined)
        return _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading\u2026" });
    const row = texts.find((t) => t.kind === kind);
    if (!spec || !row)
        return _jsx(ErrorNote, { error: `${spec?.title ?? kind} has no wording to change.` });
    const line = senders?.senders.find((s) => s.key === spec.sender);
    return _jsx(LetterForm, { ...props, spec: spec, row: row, line: line, googleReady: senders?.googleReady ?? true });
}
function LetterForm({ api, auth, kind, spec, row, line, googleReady, uploadImage, preview, onChangeSender, onDirtyChange, }) {
    const isEmail = spec.email !== false;
    const saved = useMemo(() => ({ subject: row.subject, body: row.body }), [row.subject, row.body]);
    const f = useLetterFields(saved, { hasSubject: isEmail });
    const save = useMutation(api.saveText);
    const reset = useMutation(api.resetText);
    const sendTest = useMutation(api.sendTest);
    const saver = useSaver('The wording wasn’t saved.');
    const tester = useSaver('The test wasn’t sent.');
    const [notice, setNotice] = useState(null);
    const [tested, setTested] = useState(false);
    const [comparing, setComparing] = useState(false);
    const placeholders = spec.text?.placeholders ?? [];
    const render = (l) => (preview ? preview(l) : defaultPreview(spec, l));
    const rendered = useMemo(() => (preview ? preview(f.letter) : defaultPreview(spec, f.letter)), [f.letter, preview, spec]);
    const check = checkPlaceholders(spec, f.letter);
    const blocker = saveBlocker(spec, f.letter, f.dirty);
    const builtIn = row.builtIn;
    const connected = googleReady && !!line?.sender;
    useUnsavedWarning(f.dirty);
    // Through a ref, so an app passing a new function each render isn't told twice.
    const dirtyChanged = useRef(onDirtyChange);
    useEffect(() => {
        dirtyChanged.current = onDirtyChange;
    });
    useEffect(() => dirtyChanged.current?.(f.dirty), [f.dirty]);
    // Leaving the editor shouldn't leave the app thinking something is unsaved.
    useEffect(() => () => dirtyChanged.current?.(false), []);
    const onSave = () => void saver.save(async () => {
        const stored = await save({ auth, kind, subject: f.subject, body: f.body });
        // What was stored is cleaned (safeHtml), so it may differ a little from what was typed.
        f.set(stored);
        setNotice('Saved. Emails from now on use this wording.');
    });
    const onReset = () => saver.save(async () => {
        await reset({ auth, kind });
        f.set(builtIn);
        setNotice('Back to the built-in wording.');
    });
    const onTest = () => void tester.save(async () => {
        setTested(false);
        await sendTest({ auth, senderKey: spec.sender, letter: { subject: rendered.subject, html: rendered.html } });
        setTested(true);
    });
    return (_jsxs("div", { className: "space-y-4 text-sm", children: [notice && !f.dirty && _jsx(Note, { children: notice }), _jsxs("div", { className: "grid gap-5 xl:grid-cols-2 [&>*]:min-w-0", children: [_jsxs("div", { className: "space-y-3", children: [isEmail && _jsx(SentFrom, { line: line, googleReady: googleReady, onChange: onChangeSender }), isEmail && (_jsxs("label", { className: "block space-y-1", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "Subject" }), _jsx(Input, { ...f.subjectProps })] })), _jsxs("div", { className: "space-y-1", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: isEmail ? 'Body' : 'Text' }), _jsx(RichEmailEditor, { ...f.bodyProps, placeholders: placeholders, uploadImage: uploadImage, label: isEmail ? 'Body' : 'Text' })] }), _jsx(PlaceholderChips, { onInsert: f.insert, placeholders: placeholders, samples: spec.text?.sample }), _jsx(PlaceholderNotes, { unknown: check.unknown, missing: check.missing }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs(Button, { disabled: !!blocker || saver.busy, title: blocker ?? undefined, onClick: onSave, children: [_jsx(Save, {}), " ", saver.busy ? 'Saving…' : 'Save'] }), f.dirty && (_jsx(Button, { variant: "ghost", onClick: f.undo, children: "Undo changes" })), row.custom && (_jsx(ConfirmButton, { icon: _jsx(RotateCcw, {}), confirmLabel: "Reset this wording", hint: "Throws away the saved wording and goes back to the one built into the app.", disabled: saver.busy, onConfirm: onReset, children: "Reset to built-in" })), !sameLetter(f.letter, builtIn) && (_jsxs(Button, { variant: "outline", onClick: () => setComparing(true), children: [_jsx(GitCompare, {}), " Compare with built-in"] })), isEmail && (_jsxs(Button, { variant: "outline", disabled: !connected || tester.busy, title: connected ? 'Sends the preview, as it is now, to your own address' : 'Connect a sender first', onClick: onTest, children: [_jsx(Send, {}), " ", tester.busy ? 'Sending…' : 'Send test to me'] }))] }), _jsxs("p", { className: f.dirty && blocker ? 'text-xs text-destructive' : 'text-xs text-muted-foreground', children: [statusText({ dirty: f.dirty, custom: row.custom, updatedBy: row.updatedBy, updatedAt: row.updatedAt }), f.dirty && blocker && ` ${blocker}`] }), tested && _jsx("p", { className: "text-xs text-primary", children: "A test is on its way to your email address." }), _jsx(ErrorNote, { error: saver.error ?? tester.error })] }), _jsxs("div", { className: "space-y-2 self-start xl:sticky xl:top-4", children: [rendered.caption && _jsx("p", { className: "text-xs text-muted-foreground", children: rendered.caption }), _jsx(LetterPreview, { subject: isEmail ? rendered.subject : undefined, html: rendered.html })] })] }), comparing && (_jsx(CompareDialog, { open: true, onOpenChange: setComparing, current: rendered, builtIn: render(builtIn), hasSubject: isEmail, onUseBuiltIn: () => {
                    f.set(builtIn);
                    setNotice(null);
                } }))] }));
}
/** "Sent from <address> · change", or a warning that nothing goes out until a sender is connected. */
function SentFrom({ line, googleReady, onChange }) {
    const change = onChange && (_jsxs(_Fragment, { children: [' · ', _jsx("button", { type: "button", className: "text-primary underline-offset-4 hover:underline", onClick: onChange, children: line?.sender && googleReady ? 'change' : 'connect one' })] }));
    const title = line?.title ?? 'this line';
    if (!googleReady || !line?.sender) {
        return (_jsxs(Note, { tone: "warn", children: ["Not sent yet: no Google account is connected for ", title.toLowerCase(), ".", change] }));
    }
    const { fromEmail, fromName, account } = line.sender;
    const address = fromEmail ?? account;
    return (_jsxs("p", { className: "text-xs text-muted-foreground", children: ["Sent from ", _jsx("span", { className: "font-medium text-foreground", children: fromName ? `${fromName} <${address}>` : address }), " (", title.toLowerCase(), ")", change] }));
}
//# sourceMappingURL=LetterEditor.js.map