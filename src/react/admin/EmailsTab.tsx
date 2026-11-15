// Every email the app sends, from its mail config, under the sender line it goes out on: what it is,
// when it goes, and whether its wording is the built-in one or an admin's. Editable ones open the
// letter editor; the app's own rows (an attachment's address, an event's letter) sit among them.
import { useQuery } from 'convex/react'
import { Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MailConfig } from '../../core/config.js'
import type { ExtraEmailRow, MailAdminBase } from '../types.js'
import { Button } from '../ui/button.js'
import { kindsFrom, sendersOf } from './format.js'

export function EmailsTab<C extends MailConfig>({ api, auth, config, extraRows = [], onEdit }: MailAdminBase<C> & { extraRows?: readonly ExtraEmailRow[]; onEdit: (kind: string) => void }) {
  const texts = useQuery(api.texts, { auth })
  const senders = sendersOf(config)
  const groups = Object.entries(senders).map(([key, s]) => ({ key, title: s.title, kinds: kindsFrom(config, key), extras: extraRows.filter((r) => r.sender === key) }))
  const loose = extraRows.filter((r) => !r.sender || !(r.sender in senders))

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <h3 className="text-sm font-medium">{g.title}</h3>
          <ul className="divide-y rounded-lg border">
            {g.kinds.map(([kind, spec]) => {
              const text = texts?.find((t) => t.kind === kind)
              return (
                <Row key={kind} title={spec.title} when={spec.when}>
                  {spec.email === false && <Badge>Text on a form</Badge>}
                  {text && <Badge strong={text.custom}>{text.custom ? 'Custom wording' : 'Built-in wording'}</Badge>}
                  {spec.text && (
                    <Button variant="outline" onClick={() => onEdit(kind)}>
                      <Pencil /> Edit
                    </Button>
                  )}
                </Row>
              )
            })}
            {g.extras.map((r) => (
              <ExtraRow key={r.key} row={r} />
            ))}
            {!g.kinds.length && !g.extras.length && <li className="px-3 py-2 text-sm text-muted-foreground">Nothing is sent from this line yet.</li>}
          </ul>
        </section>
      ))}
      {loose.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Also</h3>
          <ul className="divide-y rounded-lg border">
            {loose.map((r) => (
              <ExtraRow key={r.key} row={r} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Row({ title, when, children, below }: { title: string; when?: string; children?: ReactNode; below?: ReactNode }) {
  return (
    <li className="space-y-2 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          {when && <p className="text-xs text-muted-foreground">{when}</p>}
        </div>
        {children}
      </div>
      {below}
    </li>
  )
}

const ExtraRow = ({ row }: { row: ExtraEmailRow }) => (
  <Row title={row.title} when={row.when} below={row.children}>
    {row.action}
  </Row>
)

const Badge = ({ children, strong }: { children: ReactNode; strong?: boolean }) => (
  <span className={strong ? 'rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary' : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'}>{children}</span>
)
