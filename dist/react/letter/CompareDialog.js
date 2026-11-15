import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RotateCcw } from 'lucide-react';
import { Button } from '../ui/button.js';
import { Dialog } from '../ui/dialog.js';
import { LetterPreview } from './LetterPreview.js';
/** The letter in the editor beside the built-in one, both as they'd arrive, with a way to start again from the built-in. */
export function CompareDialog({ open, onOpenChange, current, builtIn, hasSubject, onUseBuiltIn, }) {
    return (_jsxs(Dialog, { open: open, onOpenChange: onOpenChange, title: "Compare with the built-in wording", className: "sm:max-w-6xl", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2 [&>*]:min-w-0", children: [_jsxs("section", { className: "space-y-1", children: [_jsx("h3", { className: "text-xs font-medium text-muted-foreground", children: "In the editor" }), _jsx(LetterPreview, { subject: hasSubject ? current.subject : undefined, html: current.html, title: "The letter in the editor", className: "h-[60vh]" })] }), _jsxs("section", { className: "space-y-1", children: [_jsx("h3", { className: "text-xs font-medium text-muted-foreground", children: "Built in" }), _jsx(LetterPreview, { subject: hasSubject ? builtIn.subject : undefined, html: builtIn.html, title: "The built-in letter", className: "h-[60vh]" })] })] }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center justify-end gap-2", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "Puts the built-in wording in the editor; nothing is saved until you press Save." }), _jsxs(Button, { variant: "outline", onClick: () => {
                            onUseBuiltIn();
                            onOpenChange(false);
                        }, children: [_jsx(RotateCcw, {}), " Start from the built-in"] })] })] }));
}
//# sourceMappingURL=CompareDialog.js.map