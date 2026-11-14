import type { ReactNode } from 'react';
/** A save or load error. `compact` fits a toolbar or footer: one line, no background. */
export declare function ErrorNote({ error, compact, className }: {
    error: string | null | undefined;
    compact?: boolean;
    className?: string;
}): import("react").JSX.Element | null;
declare const TONES: {
    ok: string;
    warn: string;
    error: string;
};
/** A short message in a box: done (ok), something to look at (warn), or what stops a save (error). */
export declare function Note({ tone, children, className }: {
    tone?: keyof typeof TONES;
    children: ReactNode;
    className?: string;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=notes.d.ts.map