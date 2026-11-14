import { jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from './button.js';
/**
 * An action that asks once more: the first click turns the button red with `confirmLabel`, the
 * second runs `onConfirm` and, once it's done, asks again next time.
 */
export function ConfirmButton({ children, confirmLabel, onConfirm, icon, hint, disabled, }) {
    const [armed, setArmed] = useState(false);
    return armed ? (_jsxs(Button, { variant: "destructive", title: hint, disabled: disabled, onClick: async () => {
            await onConfirm();
            setArmed(false);
        }, onBlur: () => setArmed(false), children: [icon, " ", confirmLabel] })) : (_jsxs(Button, { variant: "outline", disabled: disabled, onClick: () => setArmed(true), children: [icon, " ", children] }));
}
//# sourceMappingURL=ConfirmButton.js.map