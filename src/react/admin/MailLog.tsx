// The log of every email, newest first, a page at a time, with filters and a search by recipient.
// Staff see it without bodies (showBodies false): the body query is never called then.
import { usePaginatedQuery, useQuery } from 'convex/react'
import { useState } from 'react'
import type { MailConfig } from '../../core/config.js'
import { MailStatus, type MailStatusValue } from '../MailStatus.js'
import type { MailAdminBase, MailMessage } from '../types.js'
import { Button } from '../ui/button.js'
import { Input, Select } from '../ui/input.js'
import { dateTime, kindsOf, kindTitle, sendersOf, useDebounced } from './format.js'
import { LogSettings } from './LogSettings.js'
import { MessageDialog, type RefLink } from './MessageDialog.js'

export interface MailLogProps<C extends MailConfig> extends MailAdminBase<C> {
  /** False for staff: the list only, no body, no Resend, no settings. */
  showBodies?: boolean
  /** A link to what an email is about (an application, a registration), for the detail view. */
  refLink?: RefLink
  pageSize?: number
}

const STATUSES: { value: MailStatusValue; label: string }[] = [
  { value: 'failed', label: 'Failed' },
  { value: 'sent', label: 'Sent' },
  { value: 'queued', label: 'Waiting to send' },
  { value: 'sending', label: 'Sending' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function MailLog<C extends MailConfig>({ api, auth, config, showBodies = true, refLink, pageSize = 25 }: MailLogProps<C>) {
  const [status, setStatus] = useState<MailStatusValue | ''>('')
  const [senderKey, setSenderKey] = useState('')
  const [kind, setKind] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<MailMessage | null>(null)
  const text = useDebounced(search.trim(), 300)
  // Convex arguments can't hold undefined, so a filter that isn't set is left out.
  const filters = { ...(status ? { status } : {}), ...(senderKey ? { senderKey } : {}), ...(kind ? { kind } : {}) }
  const listed = usePaginatedQuery(api.messages, text ? 'skip' : { auth, ...filters }, { initialNumItems: pageSize })
  const found = useQuery(api.searchMessages, text ? { auth, text, ...filters } : 'skip')
  const rows = text ? found : listed.status === 'LoadingFirstPage' ? undefined : listed.results
  const filtered = !!(status || senderKey || kind || text)
  // The open email as the list has it now, so its status follows a retry or a resend.
  const current = open ? (rows?.find((m) => m.id === open.id) ?? open) : null

  return (
    <div className="space-y-4">
      {showBodies && <LogSettings api={api} auth={auth} config={config} />}
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value as MailStatusValue | '')}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Sender" className="w-auto" value={senderKey} onChange={(e) => setSenderKey(e.target.value)}>
          <option value="">Any sender</option>
          {Object.entries(sendersOf(config)).map(([key, s]) => (
            <option key={key} value={key}>
              {s.title}
            </option>
          ))}
        </Select>
        <Select aria-label="Email" className="w-auto max-w-64" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Any email</option>
          {Object.entries(kindsOf(config))
            .filter(([, k]) => k.email !== false)
            .map(([key, k]) => (
              <option key={key} value={key}>
                {k.title}
              </option>
            ))}
        </Select>
        <Input type="search" aria-label="Search by recipient" placeholder="Search by recipient…" className="w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {rows === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{filtered ? 'No emails match.' : 'No emails yet.'}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">To</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((m) => (
                <tr key={m.id} className="align-top hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{dateTime(m.sentAt ?? m.createdAt)}</td>
                  <td className="px-3 py-2">
                    <MailStatus status={m.status} title={m.status === 'queued' && m.attempts > 0 ? `Tried ${m.attempts} times; trying again soon.` : undefined} />
                  </td>
                  <td className="min-w-48 px-3 py-2">
                    <button type="button" className="text-left hover:underline" onClick={() => setOpen(m)}>
                      <span className="block text-xs text-muted-foreground">{kindTitle(config, m.kind)}</span>
                      <span className="font-medium">{m.subject || '(no subject)'}</span>
                    </button>
                    {m.error && <p className="text-xs text-destructive">{m.error}</p>}
                  </td>
                  <td className="px-3 py-2 break-all">{m.to.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!text && listed.status === 'CanLoadMore' && (
        <Button variant="outline" onClick={() => listed.loadMore(pageSize)}>
          Show more
        </Button>
      )}
      {!text && listed.status === 'LoadingMore' && <p className="text-sm text-muted-foreground">Loading…</p>}
      {text && found && found.length >= 50 && <p className="text-xs text-muted-foreground">The best 50 matches; type more of the address to narrow them.</p>}
      {current && <MessageDialog api={api} auth={auth} config={config} message={current} showBodies={showBodies} refLink={refLink} onClose={() => setOpen(null)} />}
    </div>
  )
}
