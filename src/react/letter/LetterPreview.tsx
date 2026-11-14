// The email as it will arrive, in an iframe with the mail's own look. It follows the app's light or
// dark theme, and has its own switch to see the other one (a letter as it arrives on a white page).
import { Moon, Sun } from 'lucide-react'
import { type Ref, useState } from 'react'
import { cn } from '../cn.js'
import { Button } from '../ui/button.js'
import { type PreviewTheme, previewDocument, useAppTheme } from './preview.js'

export function PreviewThemeSwitch({ theme, onChange }: { theme: PreviewTheme; onChange: (theme: PreviewTheme) => void }) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Button variant="ghost" size="icon" title={`Preview in ${next}`} aria-label={`Preview in ${next}`} onClick={() => onChange(next)}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}

/** The subject, and the body in a frame with the mail's own look (light or dark, with a switch). Without `subject`, the body only. */
export function LetterPreview({
  subject,
  html,
  title = 'Email preview',
  className,
  ref,
  onLoad,
}: {
  subject?: string
  html: string
  title?: string
  /** The frame's height classes. */
  className?: string
  ref?: Ref<HTMLIFrameElement>
  onLoad?: () => void
}) {
  const app = useAppTheme()
  // The app's theme until this preview's switch is used, then the one picked (while it's on screen).
  const [own, setOwn] = useState<PreviewTheme | null>(null)
  const theme = own ?? app
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center gap-2 border-b py-1 pr-1 pl-3 text-sm">
        <span className="min-w-0 flex-1">
          {subject !== undefined && (
            <>
              <span className="text-xs text-muted-foreground">Subject: </span>
              <span className="font-medium">{subject || '—'}</span>
            </>
          )}
        </span>
        <PreviewThemeSwitch theme={theme} onChange={setOwn} />
      </div>
      <iframe
        ref={ref}
        onLoad={onLoad}
        title={title}
        // Same origin so an app can scroll it to a fill-in; still no scripts.
        sandbox="allow-same-origin"
        // Its own background while the page loads, so switching doesn't flash white.
        className={cn('w-full', className ?? 'h-80 lg:h-[min(70vh,44rem)]', theme === 'dark' ? 'bg-neutral-900' : 'bg-white')}
        srcDoc={previewDocument(html, theme)}
      />
    </div>
  )
}
