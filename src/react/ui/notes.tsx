import type { ReactNode } from 'react'
import { cn } from '../cn.js'

/** A save or load error. `compact` fits a toolbar or footer: one line, no background. */
export function ErrorNote({ error, compact, className }: { error: string | null | undefined; compact?: boolean; className?: string }) {
  if (!error) return null
  return (
    <p role="alert" title={compact ? error : undefined} className={cn('text-sm text-destructive', compact ? 'min-w-0 truncate' : 'rounded-lg bg-destructive/10 px-3 py-2', className)}>
      {error}
    </p>
  )
}

const TONES = {
  ok: 'bg-primary/10',
  warn: 'border border-amber-500/50 bg-amber-500/10',
  error: 'border border-destructive/40 bg-destructive/10',
}

/** A short message in a box: done (ok), something to look at (warn), or what stops a save (error). */
export function Note({ tone = 'ok', children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return (
    <div role={tone === 'ok' ? 'status' : 'alert'} className={cn('rounded-lg px-3 py-2 text-sm', TONES[tone], className)}>
      {children}
    </div>
  )
}
