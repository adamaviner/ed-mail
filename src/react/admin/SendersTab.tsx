// The sender lines: sign in to a Google account for each, choose the address, name and reply-to it
// sends with, send a test, retry what failed, disconnect. Until the deployment has a Google OAuth
// client, a card says how to make one.
import { useMutation, useQuery } from 'convex/react'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { MailConfig } from '../../core/config.js'
import type { ConnectedSender, MailAdminBase, SenderLine } from '../types.js'
import { Button } from '../ui/button.js'
import { ConfirmButton } from '../ui/ConfirmButton.js'
import { Field, Input } from '../ui/input.js'
import { ErrorNote } from '../ui/notes.js'
import { useSaver } from '../useSaver.js'
import { dateTime, kindsFrom } from './format.js'

export function SendersTab<C extends MailConfig>({ api, auth, config }: MailAdminBase<C>) {
  const data = useQuery(api.senders, { auth })
  if (data === undefined) return <p className="text-sm text-muted-foreground">Loading…</p>
  return (
    <div className="space-y-6">
      {!data.googleReady && <SetupCard redirectUri={data.redirectUri} />}
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Every email is listed under the account that sends it. Sign in with the Google account that should send each group. The app can only send as it (it can’t read the mailbox). One account can
          send more than one group.
        </p>
        <ul className="divide-y rounded-lg border">
          {data.senders.map((line) => (
            <SenderRow key={line.key} api={api} auth={auth} config={config} line={line} googleReady={data.googleReady} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function SenderRow<C extends MailConfig>({ api, auth, config, line, googleReady }: MailAdminBase<C> & { line: SenderLine; googleReady: boolean }) {
  const startConnect = useMutation(api.startConnect)
  const disconnect = useMutation(api.disconnect)
  const sendTest = useMutation(api.sendTest)
  const retryFailed = useMutation(api.retryFailed)
  const saver = useSaver()
  const [done, setDone] = useState<string | null>(null)
  const { sender } = line
  const sends = kindsFrom(config, line.key).filter(([, k]) => k.email !== false)

  const signIn = () =>
    saver.save(async () => {
      const { url } = await startConnect({ auth, senderKey: line.key })
      window.location.assign(url)
    })
  const act = (fn: () => Promise<string>) =>
    void saver.save(async () => {
      setDone(null)
      setDone(await fn())
    })

  return (
    <li className="space-y-3 p-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">{line.title}</h3>
          {sends.length ? (
            <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
              {sends.map(([kind, k]) => (
                <li key={kind}>
                  {k.title}: {k.when}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing is sent from here yet.</p>
          )}
          {sender ? (
            <p className="mt-1 text-sm">
              Sends as <span className="font-medium">{sender.fromEmail ?? sender.account}</span>
              {sender.fromEmail && <span className="text-muted-foreground"> (signed in as {sender.account})</span>}
              {sender.connectedBy && <span className="text-muted-foreground"> · connected by {sender.connectedBy}</span>}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{sends.length ? 'Not connected: none of this is sent.' : 'Not connected.'}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {sender && (
            <Button
              variant="outline"
              disabled={saver.busy}
              onClick={() =>
                act(async () => {
                  await sendTest({ auth, senderKey: line.key })
                  return 'A test is on its way to your email address.'
                })
              }
            >
              Send a test
            </Button>
          )}
          {sender && (
            <Button
              variant="outline"
              disabled={saver.busy}
              title="Queues again what this line failed to send in the last week"
              onClick={() =>
                act(async () => {
                  const n = await retryFailed({ auth, senderKey: line.key })
                  return n ? `Queued ${n} failed ${n === 1 ? 'email' : 'emails'} again.` : 'Nothing failed from this line in the last week.'
                })
              }
            >
              <RefreshCw /> Retry failed emails
            </Button>
          )}
          <Button variant={sender ? 'outline' : 'default'} disabled={!googleReady || saver.busy} onClick={() => void signIn()}>
            {sender ? 'Use another account' : 'Sign in with Google'}
          </Button>
          {sender && (
            <ConfirmButton confirmLabel="Stop sending this kind of email" disabled={saver.busy} onConfirm={() => saver.save(() => disconnect({ auth, senderKey: line.key }))}>
              Disconnect
            </ConfirmButton>
          )}
        </div>
      </div>
      {done && <p className="text-sm text-primary">{done}</p>}
      <ErrorNote error={saver.error} />
      {sender?.lastError && <ErrorNote error={`Last failure (${dateTime(sender.lastErrorAt ?? 0)}): ${sender.lastError}`} />}
      {sender && <SenderOptions key={`${sender.account}:${sender.fromEmail}:${sender.fromName}:${sender.replyTo}`} api={api} auth={auth} config={config} senderKey={line.key} sender={sender} />}
    </li>
  )
}

function SenderOptions<C extends MailConfig>({ api, auth, senderKey, sender }: MailAdminBase<C> & { senderKey: string; sender: ConnectedSender }) {
  const update = useMutation(api.updateSender)
  const saver = useSaver()
  const [form, setForm] = useState({ fromEmail: sender.fromEmail ?? '', fromName: sender.fromName ?? '', replyTo: sender.replyTo ?? '' })
  const changed = form.fromEmail !== (sender.fromEmail ?? '') || form.fromName !== (sender.fromName ?? '') || form.replyTo !== (sender.replyTo ?? '')
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })
  const id = (k: string) => `mail-${senderKey}-${k}`
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Send as" htmlFor={id('from')} hint="Blank: the account itself. Else one of its Gmail “Send mail as” addresses.">
          <Input id={id('from')} type="email" placeholder={sender.account} value={form.fromEmail} onChange={set('fromEmail')} />
        </Field>
        <Field label="From name" htmlFor={id('name')} hint="Shown as the sender.">
          <Input id={id('name')} value={form.fromName} onChange={set('fromName')} />
        </Field>
        <Field label="Replies go to" htmlFor={id('reply')} hint="Blank: back to the sender.">
          <Input id={id('reply')} type="email" value={form.replyTo} onChange={set('replyTo')} />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3">
        <ErrorNote error={saver.error} compact className="flex-1" />
        <Button disabled={!changed || saver.busy} onClick={() => void saver.save(() => update({ auth, senderKey, ...form }))}>
          Save
        </Button>
      </div>
    </div>
  )
}

/** Shown until the deployment has a Google OAuth client (the app's `google` option returns null). */
function SetupCard({ redirectUri }: { redirectUri: string }) {
  const code = 'rounded bg-muted px-1 text-xs break-all'
  return (
    <section className="space-y-2 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Set up Google sign-in first</h3>
      <p className="text-sm text-muted-foreground">One time, in Google Cloud, with an account of the organisation’s Google Workspace.</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>Make (or pick) a Google Cloud project and turn on the Gmail API.</li>
        <li>OAuth consent screen: user type Internal, so only the organisation’s accounts can sign in.</li>
        <li>
          Credentials → Create OAuth client ID → Web application, with this authorized redirect URI: <code className={code}>{redirectUri}</code>
        </li>
        <li>
          Set its ID and secret on this Convex deployment where the app’s mail setup reads them (usually <code className={code}>GOOGLE_CLIENT_ID</code> and{' '}
          <code className={code}>GOOGLE_CLIENT_SECRET</code>), then reload this page.
        </li>
      </ol>
    </section>
  )
}
