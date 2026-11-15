import { jsx as _jsx } from "react/jsx-runtime";
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
/** A row of tabs. The panels are the caller's: it shows the one for `value`. */
export function Tabs({ value, onChange, tabs, label }) {
    return (_jsx(TabsPrimitive.Root, { value: value, onValueChange: (v) => onChange(v), children: _jsx(TabsPrimitive.List, { "aria-label": label, className: "inline-flex h-8 w-fit items-center rounded-lg bg-muted p-[3px] text-muted-foreground", children: tabs.map((t) => (_jsx(TabsPrimitive.Tab, { value: t.value, className: "inline-flex h-full items-center gap-1.5 rounded-md border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm", children: t.label }, t.value))) }) }));
}
//# sourceMappingURL=tabs.js.map