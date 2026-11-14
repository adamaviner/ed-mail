export type MailStatusValue = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled'

const LABELS: Record<MailStatusValue, string> = { queued: 'Sending…', sending: 'Sending…', sent: 'Sent', failed: 'Failed', cancelled: 'Cancelled' }

/** A small badge for an email's state, shown next to the thing the email belongs to. */
export function MailStatus({ status, title }: { status: MailStatusValue; title?: string }) {
  const tone = status === 'failed' ? 'bg-destructive/10 text-destructive' : status === 'sent' ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground'
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {LABELS[status]}
    </span>
  )
}
