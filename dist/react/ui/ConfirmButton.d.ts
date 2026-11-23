import { type ReactNode } from 'react';
/**
 * An action that asks once more: the first click turns the button red with `confirmLabel`, the
 * second runs `onConfirm` and, once it's done, asks again next time.
 */
export declare function ConfirmButton({ children, confirmLabel, onConfirm, icon, hint, disabled, }: {
    children: ReactNode;
    confirmLabel: ReactNode;
    onConfirm: () => unknown;
    icon?: ReactNode;
    /** More about what confirming does, on hover of the red button. */
    hint?: string;
    disabled?: boolean;
}): import("react").JSX.Element;
//# sourceMappingURL=ConfirmButton.d.ts.map