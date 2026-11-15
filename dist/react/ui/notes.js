import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../cn.js';
/** A save or load error. `compact` fits a toolbar or footer: one line, no background. */
export function ErrorNote({ error, compact, className }) {
    if (!error)
        return null;
    return (_jsx("p", { role: "alert", title: compact ? error : undefined, className: cn('text-sm text-destructive', compact ? 'min-w-0 truncate' : 'rounded-lg bg-destructive/10 px-3 py-2', className), children: error }));
}
const TONES = {
    ok: 'bg-primary/10',
    warn: 'border border-amber-500/50 bg-amber-500/10',
    error: 'border border-destructive/40 bg-destructive/10',
};
/** A short message in a box: done (ok), something to look at (warn), or what stops a save (error). */
export function Note({ tone = 'ok', children, className }) {
    return (_jsx("div", { role: tone === 'ok' ? 'status' : 'alert', className: cn('rounded-lg px-3 py-2 text-sm', TONES[tone], className), children: children }));
}
//# sourceMappingURL=notes.js.map