import type { ReactNode } from 'react';
/** A modal with a title and a close button. */
export declare function Dialog({ open, onOpenChange, title, children, className }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    children: ReactNode;
    className?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=dialog.d.ts.map