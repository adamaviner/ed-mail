// Admin → Email: every email the app sends and its wording (Emails), the Google accounts that send
// them (Senders), and the log (Sent & failed). The app owns the URL: it passes the tab, and
// optionally the letter being edited, and hears when they change.
import { useQuery } from 'convex/react'
import { ArrowLeft } from 'lucide-react'
import { useRef, useState } from 'react'
import type { MailConfig } from '../../core/config.js'
import type { UploadImage } from '../editor/RichTextEditor.js'
import { LetterEditor } from '../letter/LetterEditor.js'
import type { ExtraEmailRow, KindKey, MailAdminBase, PreviewRenderers } from '../types.js'
import { Button } from '../ui/button.js'
import { ErrorNote, Note } from '../ui/notes.js'
import { Tabs } from '../ui/tabs.js'
import { EmailsTab } from './EmailsTab.js'
import { kindTitle } from './format.js'
import { MailLog } from './MailLog.js'
import type { RefLink } from './MessageDialog.js'
import { SendersTab } from './SendersTab.js'

export type MailAdminTab = 'emails' | 'senders' | 'log'

export interface MailAdminPageProps<C extends MailConfig> extends MailAdminBase<C> {
  tab: MailAdminTab
  onTabChange: (tab: MailAdminTab) => void
  /** The kind whose wording is open (null: the list). Pass it with onEditKindChange to keep it in the URL; else the page keeps it. */
  editKind?: KindKey<C> | null
  onEditKindChange?: (kind: KindKey<C> | null) => void
  /** Puts an image somewhere public and returns its address, for the letter editor. */
  uploadImage?: UploadImage
  /** A link to what an email is about, in the log's detail view; for 'rebuild' kinds it is the way to send again. */
  refLink?: RefLink
  /** Previews for kinds that need more than their sample values. */
  previews?: PreviewRenderers<C>
  /** The app's own rows on the Emails tab. */
  extraRows?: readonly ExtraEmailRow[]
  /** False for staff: only the log, without bodies, Resend or settings. Admin-only queries aren't called. */
  showBodies?: boolean
  /** Shown at the top, e.g. how a Google sign-in went (the app reads its return address). */
  notice?: { ok: boolean; text: string } | null
  /** Told when the open letter gets or loses unsaved changes, so the app can stop its router leaving. */
  onDirtyChange?: (dirty: boolean) => void
}

const LEAVE = 'This letter has unsaved changes. Leave without saving them?'

export function MailAdminPage<C extends MailConfig>(props: MailAdminPageProps<C>) {
  const { api, auth, config, tab, showBodies = true, notice } = props
  if (!showBodies) return <MailLog api={api} auth={auth} config={config} showBodies={false} refLink={props.refLink} />
  return (
    <div className="space-y-4">
      {notice && (notice.ok ? <Note>{notice.text}</Note> : <ErrorNote error={notice.text} />)}
      <AdminTabs {...props} />
      {tab === 'log' && <MailLog api={api} auth={auth} config={config} refLink={props.refLink} />}
    </div>
  )
}

function AdminTabs<C extends MailConfig>({ api, auth, config, tab, onTabChange, editKind, onEditKindChange, uploadImage, previews, extraRows, onDirtyChange }: MailAdminPageProps<C>) {
  const failures = useQuery(api.failureCount, { auth })
  const [ownKind, setOwnKind] = useState<KindKey<C> | null>(null)
  const controlled = editKind !== undefined
  const open = controlled ? editKind : ownKind
  const dirty = useRef(false)

  /** Runs a move away from the open letter, after asking when it has unsaved changes. */
  const leave = (go: () => void) => {
    if (dirty.current && !window.confirm(LEAVE)) return
    dirty.current = false
    go()
  }
  const setOpen = (kind: KindKey<C> | null) => (controlled ? onEditKindChange?.(kind) : setOwnKind(kind))
  const tabs = [
    { value: 'emails' as const, label: 'Emails' },
    { value: 'senders' as const, label: 'Senders' },
    {
      value: 'log' as const,
      label: (
        <>
          Sent & failed
          {!!failures && <span className="rounded-full bg-destructive/10 px-1.5 text-xs text-destructive">{failures >= 100 ? '100+' : failures}</span>}
        </>
      ),
    },
  ]

  return (
    <>
      <Tabs label="Email" value={tab} tabs={tabs} onChange={(t) => leave(() => onTabChange(t))} />
      {tab === 'emails' &&
        (open ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => leave(() => setOpen(null))}>
                <ArrowLeft /> All emails
              </Button>
              <h2 className="text-base font-medium">{kindTitle(config, open)}</h2>
            </div>
            <LetterEditor
              key={open}
              api={api}
              auth={auth}
              config={config}
              kind={open}
              uploadImage={uploadImage}
              preview={previews?.[open]}
              onChangeSender={() => leave(() => onTabChange('senders'))}
              onDirtyChange={(d) => {
                dirty.current = d
                onDirtyChange?.(d)
              }}
            />
          </div>
        ) : (
          <EmailsTab api={api} auth={auth} config={config} extraRows={extraRows} onEdit={(kind) => setOpen(kind as KindKey<C>)} />
        ))}
      {tab === 'senders' && <SendersTab api={api} auth={auth} config={config} />}
    </>
  )
}
