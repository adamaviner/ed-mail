// How an app shows Admin → Email (typechecked against the example's generated api, so a change to
// the admin api that breaks apps breaks here first). The app keeps the tab in its URL however its
// router does; this one uses plain history.
import { MailAdminPage, type MailAdminTab } from '@earthdance/mail/react'
import { useState } from 'react'
import { api } from '../convex/_generated/api.js'
import { mailConfig } from '../convex/mailConfig.js'

const TABS: readonly MailAdminTab[] = ['emails', 'senders', 'log']

export function EmailAdmin({ token, isAdmin }: { token: string; isAdmin: boolean }) {
  const params = new URLSearchParams(window.location.search)
  const [tab, setTab] = useState<MailAdminTab>(() => TABS.find((t) => t === params.get('tab')) ?? 'emails')
  // Google sign-in comes back to the address `afterConnect` gave (convex/mail.ts), with how it went.
  const [notice] = useState(() => {
    const error = params.get('error')
    const connected = params.get('connected')
    return error ? { ok: false, text: error } : connected ? { ok: true, text: 'Signed in to Google.' } : null
  })

  return (
    <MailAdminPage
      api={api.mailAdmin}
      auth={{ token }}
      config={mailConfig}
      tab={tab}
      onTabChange={(t) => {
        setTab(t)
        history.replaceState(null, '', `?tab=${t}`)
      }}
      // Staff see the log without bodies.
      showBodies={isAdmin}
      notice={notice}
      uploadImage={async (file) => {
        const res = await fetch('/upload', { method: 'POST', body: file })
        if (!res.ok) throw new Error('The image didn’t upload.')
        return ((await res.json()) as { url: string }).url
      }}
      refLink={(ref) => (ref.type === 'signup' ? <a href={`/signups/${ref.id}`}>The sign-up</a> : null)}
      previews={{
        'accounts.welcome': (letter) => ({ subject: letter.subject.replace('{name}', 'Sam'), html: letter.body.replace('{name}', 'Sam'), caption: 'Preview for Sam' }),
      }}
      extraRows={[{ key: 'terms', sender: 'accounts', title: 'Terms linked from the welcome', action: <a href="/admin/terms">Edit the terms</a> }]}
    />
  )
}
