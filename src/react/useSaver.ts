import { useCallback, useState } from 'react'
import { errorMessage } from './errors.js'

/**
 * Runs saves, keeping the last error for display and whether one is still running. `save`
 * resolves to whether it succeeded. `fallback` is the message for errors that carry none.
 */
export function useSaver(fallback?: string) {
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(0)
  const save = useCallback(
    async (fn: () => Promise<unknown>): Promise<boolean> => {
      setRunning((n) => n + 1)
      try {
        await fn()
        setError(null)
        return true
      } catch (err) {
        setError(errorMessage(err, fallback))
        return false
      } finally {
        setRunning((n) => n - 1)
      }
    },
    [fallback],
  )
  const clear = useCallback(() => setError(null), [])
  return { error, save, clear, busy: running > 0 }
}
