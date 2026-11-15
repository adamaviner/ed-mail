import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { cn } from '../cn.js';
import { Button } from './button.js';
/** A modal with a title and a close button. */
export function Dialog({ open, onOpenChange, title, children, className }) {
    return (_jsx(DialogPrimitive.Root, { open: open, onOpenChange: (o) => onOpenChange(o), children: _jsxs(DialogPrimitive.Portal, { children: [_jsx(DialogPrimitive.Backdrop, { className: "fixed inset-0 z-50 bg-black/20" }), _jsxs(DialogPrimitive.Popup, { className: cn('fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-background p-4 text-sm text-foreground shadow-lg outline-none', className), children: [_jsxs("div", { className: "mb-3 flex items-start gap-2", children: [_jsx(DialogPrimitive.Title, { className: "min-w-0 flex-1 text-base font-medium", children: title }), _jsx(DialogPrimitive.Close, { render: _jsx(Button, { variant: "ghost", size: "icon", "aria-label": "Close" }), children: _jsx(X, {}) })] }), children] })] }) }));
}
//# sourceMappingURL=dialog.js.map