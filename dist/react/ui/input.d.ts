import type { ComponentProps, ReactNode } from 'react';
export declare function Input({ className, ...props }: Omit<ComponentProps<'input'>, 'className'> & {
    className?: string;
}): import("react").JSX.Element;
export declare function Textarea({ className, ...props }: ComponentProps<'textarea'>): import("react").JSX.Element;
export declare function Select({ className, ...props }: ComponentProps<'select'>): import("react").JSX.Element;
/** A labelled field with a hint under it. */
export declare function Field({ label, hint, htmlFor, children }: {
    label: string;
    hint?: string;
    htmlFor: string;
    children: ReactNode;
}): import("react").JSX.Element;
//# sourceMappingURL=input.d.ts.map