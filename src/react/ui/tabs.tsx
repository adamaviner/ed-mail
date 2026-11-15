import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import type { ReactNode } from 'react'

/** A row of tabs. The panels are the caller's: it shows the one for `value`. */
export function Tabs<T extends string>({ value, onChange, tabs, label }: { value: T; onChange: (value: T) => void; tabs: readonly { value: T; label: ReactNode }[]; label: string }) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsPrimitive.List aria-label={label} className="inline-flex h-8 w-fit items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
        {tabs.map((t) => (
          <TabsPrimitive.Tab
            key={t.value}
            value={t.value}
            className="inline-flex h-full items-center gap-1.5 rounded-md border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm"
          >
            {t.label}
          </TabsPrimitive.Tab>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  )
}
