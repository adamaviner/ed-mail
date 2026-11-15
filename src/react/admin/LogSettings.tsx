import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import type { MailConfig } from '../../core/config.js'
import type { MailAdminBase } from '../types.js'
import { Button } from '../ui/button.js'
import { Field, Input } from '../ui/input.js'
import { ErrorNote } from '../ui/notes.js'
import { useSaver } from '../useSaver.js'

/** How long the log keeps emails, and who hears each morning about the ones that failed. */
export function LogSettings<C extends MailConfig>({ api, auth }: MailAdminBase<C>) {
  const settings = useQuery(api.settings, { auth })
  if (settings === undefined) return null
  return <SettingsForm key={`${settings.retentionDays}:${settings.digestTo}`} api={api} auth={auth} saved={settings} />
}

function SettingsForm({ api, auth, saved }: Pick<MailAdminBase<MailConfig>, 'api' | 'auth'> & { saved: { retentionDays: number; digestTo: string } }) {
  const update = useMutation(api.updateSettings)
  const saver = useSaver('The settings weren’t saved.')
  const [days, setDays] = useState(String(saved.retentionDays))
  const [digestTo, setDigestTo] = useState(saved.digestTo)
  const changed = days !== String(saved.retentionDays) || digestTo !== saved.digestTo
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
      onSubmit={(e) => {
        e.preventDefault()
        void saver.save(() => update({ auth, retentionDays: Number(days), digestTo }))
      }}
    >
      <div className="w-40">
        <Field label="Keep emails for (days)" htmlFor="mail-retention" hint="Older ones are deleted each night.">
          <Input id="mail-retention" type="number" min={1} max={3650} step={1} required value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
      </div>
      <div className="min-w-56 flex-1">
        <Field label="Send failure reports to" htmlFor="mail-digest" hint="Each morning, when an email failed since the last report. Blank: no reports.">
          <Input id="mail-digest" type="email" value={digestTo} onChange={(e) => setDigestTo(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" disabled={!changed || saver.busy}>
        {saver.busy ? 'Saving…' : 'Save'}
      </Button>
      <ErrorNote error={saver.error} className="w-full" />
    </form>
  )
}
