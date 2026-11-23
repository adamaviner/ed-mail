// One email from the log: who, what, when, what happened. For admins (showBodies) also the body as
// it went out, and Resend: the stored copy for plain emails, or for emails made afresh each time
// (a link that can expire, a status that can change) the app's link to the thing it belongs to.
import { useMutation, useQuery } from 'convex/react'
import { Send } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import type { MailConfig } from '../../core/config.js'
import { LetterPreview } from '../letter/LetterPreview.js'
import { MailStatus } from '../MailStatus.js'
import type { MailAdminBase, MailMessage, MailRef } from '../types.js'
import { Button } from '../ui/button.js'
import { Dialog } from '../ui/dialog.js'
import { ErrorNote } from '../ui/notes.js'
import { useSaver } from '../useSaver.js'
import { dateTime, kindsOf, kindTitle, senderTitle } from './format.js'

export type RefLink = (ref: MailRef, message: MailMessage) => ReactNode

export function MessageDialog<C extends MailConfig>({
  api,
  auth,
  config,
  message: m,
  showBodies,
  refLink,
  onClose,
}: MailAdminBase<C> & { message: MailMessage; showBodies: boolean; refLink?: RefLink; onClose: () => void }) {
  const spec = kindsOf(config)[m.kind]
  const link = m.ref && refLink ? refLink(m.ref, m) : null
  const facts: [string, ReactNode][] = [
    ['To', [...m.to, ...m.cc.map((a) => `${a} (cc)`)].join(', ')],
    ['Email', kindTitle(config, m.kind)],
    ['From', senderTitle(config, m.senderKey)],
    ['Queued', `${dateTime(m.createdAt)}${m.by ? ` by ${m.by}` : ''}`],
    ...(m.sentAt ? [['Sent', dateTime(m.sentAt)] as [string, ReactNode]] : []),
    ...(m.nextAttemptAt ? [['Next try', dateTime(m.nextAttemptAt)] as [string, ReactNode]] : []),
    ['Tries', String(m.attempts)],
    ...(m.attachments.length || m.files.length ? [['Attached', [...m.attachments, ...m.files.map((f) => f.filename)].join(', ')] as [string, ReactNode]] : []),
    ...(m.replyTo ? [['Replies to', m.replyTo] as [string, ReactNode]] : []),
    ...(link ? [['About', link] as [string, ReactNode]] : []),
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={m.subject || '(no subject)'} className="sm:max-w-3xl">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MailStatus status={m.status} />
          {m.error && <span className="text-sm text-destructive">{m.error}</span>}
          {m.warning && <span className="text-sm text-amber-700 dark:text-amber-400">{m.warning}</span>}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {facts.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
        {showBodies && <Resend api={api} auth={auth} config={config} message={m} rebuild={spec?.resend === 'rebuild'} link={link} />}
        {showBodies && <Body api={api} auth={auth} config={config} id={m.id} />}
      </div>
    </Dialog>
  )
}

function Resend<C extends MailConfig>({ api, auth, message: m, rebuild, link }: MailAdminBase<C> & { message: MailMessage; rebuild: boolean; link: ReactNode }) {
  const resend = useMutation(api.resend)
  const saver = useSaver('It wasn’t queued again.')
  const [queued, setQueued] = useState(false)
  if (m.status === 'queued' || m.status === 'sending') return null
  if (rebuild) {
    return <p className="text-sm text-muted-foreground">This email is made afresh each time, so send it again from where it belongs{link ? <>: {link}</> : ' in the app'}.</p>
  }
  if (m.files.length) return <p className="text-sm text-muted-foreground">Its attached files weren’t kept, so it can’t be sent again from here.</p>
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        disabled={saver.busy || queued}
        onClick={() =>
          void saver.save(async () => {
            await resend({ auth, id: m.id })
            setQueued(true)
          })
        }
      >
        <Send /> Resend this copy
      </Button>
      {queued && <span className="text-sm text-primary">Queued again; it shows at the top of the log.</span>}
      <ErrorNote error={saver.error} compact />
    </div>
  )
}

/** The body as it went out. Only mounted for admins, so the staff list never asks for bodies. */
function Body<C extends MailConfig>({ api, auth, id }: MailAdminBase<C> & { id: string }) {
  const full = useQuery(api.message, { auth, id })
  if (full === undefined) return <p className="text-sm text-muted-foreground">Loading the email…</p>
  if (full === null) return <p className="text-sm text-muted-foreground">This email is no longer in the log.</p>
  return <LetterPreview html={full.html} title="The email as sent" className="h-[50vh]" />
}
