import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../cn.js'
import { Button } from './button.js'

/** A modal with a title and a close button. */
export function Dialog({ open, onOpenChange, title, children, className }: { open: boolean; onOpenChange: (open: boolean) => void; title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20" />
        <DialogPrimitive.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-background p-4 text-sm text-foreground shadow-lg outline-none',
            className,
          )}
        >
          <div className="mb-3 flex items-start gap-2">
            <DialogPrimitive.Title className="min-w-0 flex-1 text-base font-medium">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close render={<Button variant="ghost" size="icon" aria-label="Close" />}>
              <X />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
