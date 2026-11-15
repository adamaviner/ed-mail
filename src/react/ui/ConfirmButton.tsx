import { type ReactNode, useState } from 'react'
import { Button } from './button.js'

/**
 * An action that asks once more: the first click turns the button red with `confirmLabel`, the
 * second runs `onConfirm` and, once it's done, asks again next time.
 */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  icon,
  hint,
  disabled,
}: {
  children: ReactNode
  confirmLabel: ReactNode
  onConfirm: () => unknown
  icon?: ReactNode
  /** More about what confirming does, on hover of the red button. */
  hint?: string
  disabled?: boolean
}) {
  const [armed, setArmed] = useState(false)
  return armed ? (
    <Button
      variant="destructive"
      title={hint}
      disabled={disabled}
      onClick={async () => {
        await onConfirm()
        setArmed(false)
      }}
      onBlur={() => setArmed(false)}
    >
      {icon} {confirmLabel}
    </Button>
  ) : (
    <Button variant="outline" disabled={disabled} onClick={() => setArmed(true)}>
      {icon} {children}
    </Button>
  )
}
