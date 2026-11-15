import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Every email the app sends, from its mail config, under the sender line it goes out on: what it is,
// when it goes, and whether its wording is the built-in one or an admin's. Editable ones open the
// letter editor; the app's own rows (an attachment's address, an event's letter) sit among them.
import { useQuery } from 'convex/react';
import { Pencil } from 'lucide-react';
import { Button } from '../ui/button.js';
import { kindsFrom, sendersOf } from './format.js';
export function EmailsTab({ api, auth, config, extraRows = [], onEdit }) {
    const texts = useQuery(api.texts, { auth });
    const senders = sendersOf(config);
    const groups = Object.entries(senders).map(([key, s]) => ({ key, title: s.title, kinds: kindsFrom(config, key), extras: extraRows.filter((r) => r.sender === key) }));
    const loose = extraRows.filter((r) => !r.sender || !(r.sender in senders));
    return (_jsxs("div", { className: "space-y-6", children: [groups.map((g) => (_jsxs("section", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-medium", children: g.title }), _jsxs("ul", { className: "divide-y rounded-lg border", children: [g.kinds.map(([kind, spec]) => {
                                const text = texts?.find((t) => t.kind === kind);
                                return (_jsxs(Row, { title: spec.title, when: spec.when, children: [spec.email === false && _jsx(Badge, { children: "Text on a form" }), text && _jsx(Badge, { strong: text.custom, children: text.custom ? 'Custom wording' : 'Built-in wording' }), spec.text && (_jsxs(Button, { variant: "outline", onClick: () => onEdit(kind), children: [_jsx(Pencil, {}), " Edit"] }))] }, kind));
                            }), g.extras.map((r) => (_jsx(ExtraRow, { row: r }, r.key))), !g.kinds.length && !g.extras.length && _jsx("li", { className: "px-3 py-2 text-sm text-muted-foreground", children: "Nothing is sent from this line yet." })] })] }, g.key))), loose.length > 0 && (_jsxs("section", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-medium", children: "Also" }), _jsx("ul", { className: "divide-y rounded-lg border", children: loose.map((r) => (_jsx(ExtraRow, { row: r }, r.key))) })] }))] }));
}
function Row({ title, when, children, below }) {
    return (_jsxs("li", { className: "space-y-2 px-3 py-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-sm font-medium", children: title }), when && _jsx("p", { className: "text-xs text-muted-foreground", children: when })] }), children] }), below] }));
}
const ExtraRow = ({ row }) => (_jsx(Row, { title: row.title, when: row.when, below: row.children, children: row.action }));
const Badge = ({ children, strong }) => (_jsx("span", { className: strong ? 'rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary' : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground', children: children }));
//# sourceMappingURL=EmailsTab.js.map