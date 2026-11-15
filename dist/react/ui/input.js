import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from '../cn.js';
const FIELD = 'min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';
/** Full width unless the caller gives a width: without tailwind-merge, w-full and w-auto would both apply and the stylesheet's order would pick. */
const width = (className) => (/(^|\s)w-/.test(className ?? '') ? '' : 'w-full');
export function Input({ className, ...props }) {
    return _jsx(InputPrimitive, { className: cn('h-8', width(className), FIELD, className), ...props });
}
export function Textarea({ className, ...props }) {
    return _jsx("textarea", { className: cn(width(className), FIELD, className), ...props });
}
export function Select({ className, ...props }) {
    return _jsx("select", { className: cn('h-8 bg-background', width(className), FIELD, className), ...props });
}
/** A labelled field with a hint under it. */
export function Field({ label, hint, htmlFor, children }) {
    return (_jsxs("div", { className: "space-y-1", children: [_jsx("label", { htmlFor: htmlFor, className: "block text-xs text-muted-foreground", children: label }), children, hint && _jsx("p", { className: "text-xs text-muted-foreground", children: hint })] }));
}
//# sourceMappingURL=input.js.map