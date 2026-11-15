import { useEffect } from 'react'

/**
 * Asks the browser to warn before the page is closed or reloaded while there are unsaved changes.
 * Moving within an app is the app's router's business: LetterEditor's onDirtyChange tells it.
 */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
}
