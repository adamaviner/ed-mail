import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// The log of every email, newest first, a page at a time, with filters and a search by recipient.
// Staff see it without bodies (showBodies false): the body query is never called then.
import { usePaginatedQuery, useQuery } from 'convex/react';
import { useState } from 'react';
import { MailStatus } from '../MailStatus.js';
import { Button } from '../ui/button.js';
import { Input, Select } from '../ui/input.js';
import { dateTime, kindsOf, kindTitle, sendersOf, useDebounced } from './format.js';
import { LogSettings } from './LogSettings.js';
import { MessageDialog } from './MessageDialog.js';
const STATUSES = [
    { value: 'failed', label: 'Failed' },
    { value: 'sent', label: 'Sent' },
    { value: 'queued', label: 'Waiting to send' },
    { value: 'sending', label: 'Sending' },
    { value: 'cancelled', label: 'Cancelled' },
];
export function MailLog({ api, auth, config, showBodies = true, refLink, pageSize = 25 }) {
    const [status, setStatus] = useState('');
    const [senderKey, setSenderKey] = useState('');
    const [kind, setKind] = useState('');
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(null);
    const text = useDebounced(search.trim(), 300);
    // Convex arguments can't hold undefined, so a filter that isn't set is left out.
    const filters = { ...(status ? { status } : {}), ...(senderKey ? { senderKey } : {}), ...(kind ? { kind } : {}) };
    const listed = usePaginatedQuery(api.messages, text ? 'skip' : { auth, ...filters }, { initialNumItems: pageSize });
    const found = useQuery(api.searchMessages, text ? { auth, text, ...filters } : 'skip');
    const rows = text ? found : listed.status === 'LoadingFirstPage' ? undefined : listed.results;
    const filtered = !!(status || senderKey || kind || text);
    // The open email as the list has it now, so its status follows a retry or a resend.
    const current = open ? (rows?.find((m) => m.id === open.id) ?? open) : null;
    return (_jsxs("div", { className: "space-y-4", children: [showBodies && _jsx(LogSettings, { api: api, auth: auth, config: config }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs(Select, { "aria-label": "Status", className: "w-auto", value: status, onChange: (e) => setStatus(e.target.value), children: [_jsx("option", { value: "", children: "Any status" }), STATUSES.map((s) => (_jsx("option", { value: s.value, children: s.label }, s.value)))] }), _jsxs(Select, { "aria-label": "Sender", className: "w-auto", value: senderKey, onChange: (e) => setSenderKey(e.target.value), children: [_jsx("option", { value: "", children: "Any sender" }), Object.entries(sendersOf(config)).map(([key, s]) => (_jsx("option", { value: key, children: s.title }, key)))] }), _jsxs(Select, { "aria-label": "Email", className: "w-auto max-w-64", value: kind, onChange: (e) => setKind(e.target.value), children: [_jsx("option", { value: "", children: "Any email" }), Object.entries(kindsOf(config))
                                .filter(([, k]) => k.email !== false)
                                .map(([key, k]) => (_jsx("option", { value: key, children: k.title }, key)))] }), _jsx(Input, { type: "search", "aria-label": "Search by recipient", placeholder: "Search by recipient\u2026", className: "w-56", value: search, onChange: (e) => setSearch(e.target.value) })] }), rows === undefined ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Loading\u2026" })) : rows.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground", children: filtered ? 'No emails match.' : 'No emails yet.' })) : (_jsx("div", { className: "overflow-x-auto rounded-lg border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-muted/40 text-left text-xs text-muted-foreground", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 font-medium", children: "When" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Status" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Email" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "To" })] }) }), _jsx("tbody", { className: "divide-y", children: rows.map((m) => (_jsxs("tr", { className: "align-top hover:bg-muted/30", children: [_jsx("td", { className: "px-3 py-2 whitespace-nowrap text-muted-foreground", children: dateTime(m.sentAt ?? m.createdAt) }), _jsx("td", { className: "px-3 py-2", children: _jsx(MailStatus, { status: m.status, title: m.status === 'queued' && m.attempts > 0 ? `Tried ${m.attempts} times; trying again soon.` : undefined }) }), _jsxs("td", { className: "min-w-48 px-3 py-2", children: [_jsxs("button", { type: "button", className: "text-left hover:underline", onClick: () => setOpen(m), children: [_jsx("span", { className: "block text-xs text-muted-foreground", children: kindTitle(config, m.kind) }), _jsx("span", { className: "font-medium", children: m.subject || '(no subject)' })] }), m.error && _jsx("p", { className: "text-xs text-destructive", children: m.error }), m.warning && _jsx("p", { className: "text-xs text-amber-700 dark:text-amber-400", children: m.warning })] }), _jsx("td", { className: "px-3 py-2 break-all", children: m.to.join(', ') })] }, m.id))) })] }) })), !text && listed.status === 'CanLoadMore' && (_jsx(Button, { variant: "outline", onClick: () => listed.loadMore(pageSize), children: "Show more" })), !text && listed.status === 'LoadingMore' && _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading\u2026" }), text && found && found.length >= 50 && _jsx("p", { className: "text-xs text-muted-foreground", children: "The best 50 matches; type more of the address to narrow them." }), current && _jsx(MessageDialog, { api: api, auth: auth, config: config, message: current, showBodies: showBodies, refLink: refLink, onClose: () => setOpen(null) })] }));
}
//# sourceMappingURL=MailLog.js.map