import { type Ref } from 'react';
import { type PreviewTheme } from './preview.js';
export declare function PreviewThemeSwitch({ theme, onChange }: {
    theme: PreviewTheme;
    onChange: (theme: PreviewTheme) => void;
}): import("react").JSX.Element;
/** The subject, and the body in a frame with the mail's own look (light or dark, with a switch). Without `subject`, the body only. */
export declare function LetterPreview({ subject, html, title, className, ref, onLoad, }: {
    subject?: string;
    html: string;
    title?: string;
    /** The frame's height classes. */
    className?: string;
    ref?: Ref<HTMLIFrameElement>;
    onLoad?: () => void;
}): import("react").JSX.Element;
//# sourceMappingURL=LetterPreview.d.ts.map