import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { Button } from '../ui/button.js';
import { Field, Input } from '../ui/input.js';
import { ErrorNote } from '../ui/notes.js';
import { useSaver } from '../useSaver.js';
/** How long the log keeps emails, and who hears each morning about the ones that failed. */
export function LogSettings({ api, auth }) {
    const settings = useQuery(api.settings, { auth });
    if (settings === undefined)
        return null;
    return _jsx(SettingsForm, { api: api, auth: auth, saved: settings }, `${settings.retentionDays}:${settings.digestTo}`);
}
function SettingsForm({ api, auth, saved }) {
    const update = useMutation(api.updateSettings);
    const saver = useSaver('The settings weren’t saved.');
    const [days, setDays] = useState(String(saved.retentionDays));
    const [digestTo, setDigestTo] = useState(saved.digestTo);
    const changed = days !== String(saved.retentionDays) || digestTo !== saved.digestTo;
    return (_jsxs("form", { className: "flex flex-wrap items-end gap-3 rounded-lg border p-3", onSubmit: (e) => {
            e.preventDefault();
            void saver.save(() => update({ auth, retentionDays: Number(days), digestTo }));
        }, children: [_jsx("div", { className: "w-40", children: _jsx(Field, { label: "Keep emails for (days)", htmlFor: "mail-retention", hint: "Older ones are deleted each night.", children: _jsx(Input, { id: "mail-retention", type: "number", min: 1, max: 3650, step: 1, required: true, value: days, onChange: (e) => setDays(e.target.value) }) }) }), _jsx("div", { className: "min-w-56 flex-1", children: _jsx(Field, { label: "Send failure reports to", htmlFor: "mail-digest", hint: "Each morning, when an email failed since the last report. Blank: no reports.", children: _jsx(Input, { id: "mail-digest", type: "email", value: digestTo, onChange: (e) => setDigestTo(e.target.value) }) }) }), _jsx(Button, { type: "submit", disabled: !changed || saver.busy, children: saver.busy ? 'Saving…' : 'Save' }), _jsx(ErrorNote, { error: saver.error, className: "w-full" })] }));
}
//# sourceMappingURL=LogSettings.js.map