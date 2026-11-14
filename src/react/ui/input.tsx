import { Input as InputPrimitive } from '@base-ui/react/input'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../cn.js'

const FIELD =
  'w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export function Input({ className, ...props }: Omit<ComponentProps<'input'>, 'className'> & { className?: string }) {
  return <InputPrimitive className={cn('h-8', FIELD, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(FIELD, className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn('h-8 bg-background', FIELD, className)} {...props} />
}

/** A labelled field with a hint under it. */
export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
