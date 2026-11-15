import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Pieces of the letter editor an app can use on its own (ed-schedule's per-event welcome editor).
import { Note } from '../ui/notes.js';
const braces = (keys) => keys.map((k) => `{${k}}`);
/** Every placeholder as a chip; clicking one puts it where the cursor was. */
export function PlaceholderChips({ onInsert, placeholders, samples, }) {
    if (!placeholders.length)
        return null;
    return (_jsxs("div", { children: [_jsx("p", { className: "mb-1 text-xs text-muted-foreground", children: "Placeholders (click to insert):" }), _jsx("div", { className: "flex flex-wrap gap-1", children: placeholders.map((p) => {
                    const sample = samples?.[p.key];
                    return (_jsx("button", { type: "button", 
                        // A sample that's HTML (a list) would read badly in a tooltip.
                        title: sample && !sample.includes('<') ? `${p.label}, e.g. ${sample}` : p.label, 
                        // Focus stays in the subject or body, so typing carries on after the placeholder.
                        onMouseDown: (e) => e.preventDefault(), onClick: () => onInsert(p.key), className: "rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-xs hover:border-primary", children: `{${p.key}}` }, p.key));
                }) })] }));
}
/** Placeholders the app doesn't know (they'd go out as typed), and required ones left out. Both stop a save. */
export function PlaceholderNotes({ unknown, missing }) {
    return (_jsxs(_Fragment, { children: [unknown.length > 0 && (_jsxs(Note, { tone: "error", children: ["The app doesn\u2019t know ", braces(unknown).join(', '), ". ", unknown.length === 1 ? 'It would go out' : 'They would go out', " as typed; fix or remove ", unknown.length === 1 ? 'it' : 'them', " before saving."] })), missing.length > 0 && (_jsxs(Note, { tone: "error", children: ["This letter must include ", braces(missing).join(' and '), ": each person\u2019s own ", missing.length === 1 ? 'value goes' : 'values go', " there. Put ", missing.length === 1 ? 'it' : 'them', " back before saving."] }))] }));
}
//# sourceMappingURL=parts.js.map