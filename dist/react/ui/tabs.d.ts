import type { ReactNode } from 'react';
/** A row of tabs. The panels are the caller's: it shows the one for `value`. */
export declare function Tabs<T extends string>({ value, onChange, tabs, label }: {
    value: T;
    onChange: (value: T) => void;
    tabs: readonly {
        value: T;
        label: ReactNode;
    }[];
    label: string;
}): import("react").JSX.Element;
//# sourceMappingURL=tabs.d.ts.map