import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// The email as it will arrive, in an iframe with the mail's own look. It follows the app's light or
// dark theme, and has its own switch to see the other one (a letter as it arrives on a white page).
import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../cn.js';
import { Button } from '../ui/button.js';
import { previewDocument, useAppTheme } from './preview.js';
export function PreviewThemeSwitch({ theme, onChange }) {
    const next = theme === 'dark' ? 'light' : 'dark';
    return (_jsx(Button, { variant: "ghost", size: "icon", title: `Preview in ${next}`, "aria-label": `Preview in ${next}`, onClick: () => onChange(next), children: theme === 'dark' ? _jsx(Sun, {}) : _jsx(Moon, {}) }));
}
/** The subject, and the body in a frame with the mail's own look (light or dark, with a switch). Without `subject`, the body only. */
export function LetterPreview({ subject, html, title = 'Email preview', className, ref, onLoad, }) {
    const app = useAppTheme();
    // The app's theme until this preview's switch is used, then the one picked (while it's on screen).
    const [own, setOwn] = useState(null);
    const theme = own ?? app;
    return (_jsxs("div", { className: "overflow-hidden rounded-lg border bg-background", children: [_jsxs("div", { className: "flex items-center gap-2 border-b py-1 pr-1 pl-3 text-sm", children: [_jsx("span", { className: "min-w-0 flex-1", children: subject !== undefined && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "Subject: " }), _jsx("span", { className: "font-medium", children: subject || '—' })] })) }), _jsx(PreviewThemeSwitch, { theme: theme, onChange: setOwn })] }), _jsx("iframe", { ref: ref, onLoad: onLoad, title: title, 
                // Same origin so an app can scroll it to a fill-in; still no scripts.
                sandbox: "allow-same-origin", 
                // Its own background while the page loads, so switching doesn't flash white.
                className: cn('w-full', className ?? 'h-80 lg:h-[min(70vh,44rem)]', theme === 'dark' ? 'bg-neutral-900' : 'bg-white'), srcDoc: previewDocument(html, theme) })] }));
}
//# sourceMappingURL=LetterPreview.js.map