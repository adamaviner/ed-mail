import type { RenderedPreview } from './preview.js';
/** The letter in the editor beside the built-in one, both as they'd arrive, with a way to start again from the built-in. */
export declare function CompareDialog({ open, onOpenChange, current, builtIn, hasSubject, onUseBuiltIn, }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    current: RenderedPreview;
    builtIn: RenderedPreview;
    hasSubject: boolean;
    onUseBuiltIn: () => void;
}): import("react").JSX.Element;
//# sourceMappingURL=CompareDialog.d.ts.map