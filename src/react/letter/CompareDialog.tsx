import { RotateCcw } from 'lucide-react'
import { Button } from '../ui/button.js'
import { Dialog } from '../ui/dialog.js'
import { LetterPreview } from './LetterPreview.js'
import type { RenderedPreview } from './preview.js'

/** The letter in the editor beside the built-in one, both as they'd arrive, with a way to start again from the built-in. */
export function CompareDialog({
  open,
  onOpenChange,
  current,
  builtIn,
  hasSubject,
  onUseBuiltIn,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: RenderedPreview
  builtIn: RenderedPreview
  hasSubject: boolean
  onUseBuiltIn: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Compare with the built-in wording" className="sm:max-w-6xl">
      <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
        <section className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground">In the editor</h3>
          <LetterPreview subject={hasSubject ? current.subject : undefined} html={current.html} title="The letter in the editor" className="h-[60vh]" />
        </section>
        <section className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground">Built in</h3>
          <LetterPreview subject={hasSubject ? builtIn.subject : undefined} html={builtIn.html} title="The built-in letter" className="h-[60vh]" />
        </section>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Puts the built-in wording in the editor; nothing is saved until you press Save.</span>
        <Button
          variant="outline"
          onClick={() => {
            onUseBuiltIn()
            onOpenChange(false)
          }}
        >
          <RotateCcw /> Start from the built-in
        </Button>
      </div>
    </Dialog>
  )
}
