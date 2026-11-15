import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { emailShell } from '../core/emailHtml.js'
import { ADMIN, STAFF, app, defined, slept } from '../testing/app.js'
import { fakeGoogle, gmailUnavailable, gmailUnauthorized } from '../testing/fakeGoogle.js'

const { api, createTest } = defined
const MINUTE = 60_000

let google: ReturnType<typeof fakeGoogle>

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2030-01-01T12:00:00Z'))
  google = fakeGoogle({ email: 'welcome@example.org' })
  vi.stubGlobal('fetch', google.fetch)
  slept.length = 0
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function setup() {
  const t = createTest()
  /** Runs what is due now, and what that schedules for now. */
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(1)
      await t.finishInProgressScheduledFunctions()
    }
  }
  const later = async (ms: number) => {
    vi.advanceTimersByTime(ms)
    await settle()
  }
  /** Signs in to Google for a line, as the browser would. */
  const connect = async (senderKey = 'welcome', code = 'c1') => {
    const { url } = await t.mutation(api.mailAdmin.startConnect, { auth: ADMIN, senderKey })
    const auth = new URL(url)
    expect(auth.searchParams.get('redirect_uri')).toBe('https://example.convex.site/google/oauth/callback')
    expect(auth.searchParams.get('scope')).toContain('gmail.send')
    return await t.action(api.app.callback, { url: `https://example.convex.site/google/oauth/callback?state=${auth.searchParams.get('state')}&code=${code}` })
  }
  const log = async (status?: 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled') =>
    (await t.query(api.mailAdmin.messages, { auth: STAFF, paginationOpts: { numItems: 50, cursor: null }, status })).page
  const outcomes = () => t.query(api.app.outcomes, {})
  return { t, settle, later, connect, log, outcomes }
}

describe('senders', () => {
  test('signing in connects a line, encrypted; the admin list never shows the token', async () => {
    const { t, connect } = await setup()
    expect(await connect()).toEqual({ status: 302, location: 'https://app.example.org/admin/email?connected=welcome' })
    const { senders, googleReady, redirectUri } = await t.query(api.mailAdmin.senders, { auth: ADMIN })
    expect({ googleReady, redirectUri }).toEqual({ googleReady: true, redirectUri: 'https://example.convex.site/google/oauth/callback' })
    expect(senders.find((s) => s.key === 'welcome')!.sender).toMatchObject({ account: 'welcome@example.org', connectedBy: 'Admin', lastError: null })
    expect(JSON.stringify(senders)).not.toContain('refresh')
    const row = await t.run(async (ctx) => await ctx.runQuery(app.components.mail.senders.credentials, { key: 'welcome' }))
    expect(row!.refreshTokenEnc).not.toContain('refresh-c1')
  })

  test('a state that isn’t ours is left for the app; a cancelled sign-in comes back with why', async () => {
    const { t } = await setup()
    expect(await t.action(api.app.callback, { url: 'https://example.convex.site/google/oauth/callback?state=other&code=x' })).toBeNull()
    const { url } = await t.mutation(api.mailAdmin.startConnect, { auth: ADMIN, senderKey: 'welcome' })
    const state = new URL(url).searchParams.get('state')
    const back = await t.action(api.app.callback, { url: `https://example.convex.site/google/oauth/callback?state=${state}&error=access_denied` })
    expect(back!.location).toContain('error=Google%20sign-in%20was%20cancelled.')
  })

  test('without the send permission, the sign-in is refused', async () => {
    google = fakeGoogle({ scope: 'openid email' })
    vi.stubGlobal('fetch', google.fetch)
    const { t, connect } = await setup()
    expect((await connect())!.location).toContain('error=')
    expect((await t.query(api.mailAdmin.senders, { auth: ADMIN })).senders.every((s) => s.sender === null)).toBe(true)
  })

  test('send as, name and reply-to are checked and used; disconnecting revokes the grant', async () => {
    const { t, connect, settle } = await setup()
    await connect()
    await expect(t.mutation(api.mailAdmin.updateSender, { auth: ADMIN, senderKey: 'welcome', fromEmail: 'nope', fromName: '', replyTo: '' })).rejects.toThrow(/Send as/)
    await t.mutation(api.mailAdmin.updateSender, { auth: ADMIN, senderKey: 'welcome', fromEmail: 'Hello@Example.org', fromName: 'Earthdance', replyTo: 'office@example.org' })
    await t.mutation(api.app.offer, { to: 'ana@example.org' })
    await settle()
    expect(google.sent[0]).toMatchObject({ from: '"Earthdance" <hello@example.org>', to: ['ana@example.org'], replyTo: 'office@example.org', subject: 'Your offer' })
    await t.mutation(api.mailAdmin.disconnect, { auth: ADMIN, senderKey: 'welcome' })
    await settle()
    expect(google.revoked).toEqual(['refresh-c1'])
  })

  test('only admins manage senders; staff may read the log', async () => {
    const { t } = await setup()
    await expect(t.query(api.mailAdmin.senders, { auth: STAFF })).rejects.toThrow('Not allowed')
    await expect(t.mutation(api.mailAdmin.startConnect, { auth: STAFF, senderKey: 'welcome' })).rejects.toThrow('Not allowed')
    expect((await t.query(api.mailAdmin.messages, { auth: STAFF, paginationOpts: { numItems: 5, cursor: null } })).page).toEqual([])
    await expect(t.query(api.mailAdmin.messages, { auth: {}, paginationOpts: { numItems: 5, cursor: null } })).rejects.toThrow('Not allowed')
  })
})

describe('queueing and the drain', () => {
  test('a queued email goes out once, is logged with its body, and onSettled hears once', async () => {
    const { t, connect, settle, log, outcomes } = await setup()
    await connect()
    const id = await t.mutation(api.app.offer, { to: 'ana@example.org' })
    expect((await log())[0]).toMatchObject({ id, status: 'queued', kind: 'demo.offer', senderKey: 'welcome', to: ['ana@example.org'] })
    expect(await t.query(api.app.statusFor, {})).toMatchObject({ status: 'queued' })
    await settle()
    expect(google.sent).toHaveLength(1)
    expect(google.sent[0].text).toBe('Take it')
    expect((await log())[0]).toMatchObject({ status: 'sent', attempts: 1, sentAt: expect.any(Number) })
    expect(await outcomes()).toEqual([expect.objectContaining({ messageId: id, ok: true, context: { app: 'app1' } })])
    const detail = await t.query(api.mailAdmin.message, { auth: ADMIN, id })
    expect(detail).toMatchObject({ html: '<p>Take it</p>', text: 'Take it' })
    await expect(t.query(api.mailAdmin.message, { auth: STAFF, id })).rejects.toThrow('Not allowed')
  })

  test('with no sender connected it fails at once, says why, and onSettled hears in the same transaction', async () => {
    const { t, log, outcomes } = await setup()
    const id = await t.mutation(api.app.offer, { to: 'ana@example.org' })
    expect((await log())[0]).toMatchObject({ id, status: 'failed', error: expect.stringContaining('No Google account is connected for Emails to registrants') })
    expect(await outcomes()).toEqual([expect.objectContaining({ messageId: id, ok: false, error: expect.stringContaining('No Google account') })])
  })

  test('failures are retried after 1, 5 and 25 minutes, and only the final one is reported', async () => {
    const { t, connect, settle, later, log, outcomes } = await setup()
    await connect()
    google.refuse(() => gmailUnavailable())
    await t.mutation(api.app.offer, { to: 'ana@example.org' })
    await settle()
    expect((await log())[0]).toMatchObject({ status: 'queued', attempts: 1, error: expect.stringContaining('Gmail answered 503') })
    expect(await outcomes()).toEqual([])
    const senders = await t.query(api.mailAdmin.senders, { auth: ADMIN })
    expect(senders.senders.find((s) => s.key === 'welcome')!.sender!.lastError).toContain('503')
    await later(MINUTE)
    await later(5 * MINUTE)
    expect(await outcomes()).toEqual([])
    await later(25 * MINUTE)
    expect((await log())[0]).toMatchObject({ status: 'failed', attempts: 4 })
    expect(await outcomes()).toEqual([expect.objectContaining({ ok: false, error: expect.stringContaining('503') })])
    await later(60 * MINUTE)
    expect((await log())[0].attempts).toBe(4)
  })

  test('a retry that works is reported as sent, and clears the line’s last error', async () => {
    const { t, connect, settle, later, log, outcomes } = await setup()
    await connect()
    google.refuse(() => gmailUnavailable())
    await t.mutation(api.app.offer, { to: 'ana@example.org' })
    await settle()
    google.refuse()
    await later(MINUTE)
    expect((await log())[0]).toMatchObject({ status: 'sent', attempts: 2 })
    expect(await outcomes()).toEqual([expect.objectContaining({ ok: true })])
    expect((await t.query(api.mailAdmin.senders, { auth: ADMIN })).senders.find((s) => s.key === 'welcome')!.sender!.lastError).toBeNull()
  })

  test('a sign-in Google stopped accepting fails everything queued for the line at once, without retries', async () => {
    const { t, connect, settle, later, log, outcomes } = await setup()
    await connect()
    // The stored sign-in breaks: every refresh is refused.
    await t.run(async (ctx) => {
      const row = await ctx.runQuery(app.components.mail.senders.credentials, { key: 'welcome' })
      await ctx.runMutation(app.components.mail.senders.importSender, { key: 'welcome', account: row!.account, refreshTokenEnc: await encryptBroken(), connectedAt: 0 })
    })
    await t.mutation(api.app.offer, { to: 'ana@example.org' })
    await t.mutation(api.app.offer, { to: 'ben@example.org' })
    await settle()
    expect((await log('failed')).map((m) => m.attempts)).toEqual([1, 1])
    await later(60 * MINUTE)
    expect(google.sent).toEqual([])
    expect((await outcomes()).map((o) => o.ok)).toEqual([false, false])
    expect((await outcomes())[0].error).toContain('Sign in to Google again')
    expect((await t.query(api.mailAdmin.senders, { auth: ADMIN })).senders.find((s) => s.key === 'welcome')!.sender!.lastError).toContain('Sign in to Google again')
  })

  test('an access token Gmail rejects is refreshed once before giving up', async () => {
    const { t, connect, settle, log } = await setup()
    await connect()
    let refusals = 1
    google.refuse(() => (refusals-- > 0 ? gmailUnauthorized() : undefined))
    await t.mutation(api.app.offer, { to: 'ana@example.org' })
    await settle()
    expect((await log())[0].status).toBe('sent')
    expect(google.refreshes).toBe(2)
  })

  test('the access token is fetched once and kept between drains', async () => {
    const { t, connect, settle } = await setup()
    await connect()
    await t.mutation(api.app.offer, { to: 'ana@example.org' })
    await settle()
    await t.mutation(api.app.offer, { to: 'ben@example.org' })
    await settle()
    expect(google.sent).toHaveLength(2)
    expect(google.refreshes).toBe(1)
    expect(new Set(google.sent.map((m) => m.auth))).toEqual(new Set(['Bearer access-1']))
  })

  test('a guard that says no cancels the email quietly', async () => {
    const { t, connect, settle, log, outcomes } = await setup()
    await connect()
    await t.mutation(api.app.setWanted, { key: 'withdrawn', yes: false })
    await t.mutation(api.app.offer, { to: 'ana@example.org', guardKey: 'withdrawn' })
    await settle()
    expect(google.sent).toEqual([])
    expect((await log())[0]).toMatchObject({ status: 'cancelled' })
    expect(await outcomes()).toEqual([])
  })

  test('a newer email in the same chain replaces one still queued, so a resend during retries sends once', async () => {
    const { t, connect, settle, later, log } = await setup()
    await connect()
    google.refuse(() => gmailUnavailable())
    await t.mutation(api.app.offer, { to: 'ana@example.org', chain: 'offer:app1' })
    await settle()
    google.refuse()
    await t.mutation(api.app.offer, { to: 'ana@example.org', chain: 'offer:app1' })
    await settle()
    await later(30 * MINUTE)
    expect(google.sent).toHaveLength(1)
    expect((await log()).map((m) => m.status)).toEqual(['sent', 'cancelled'])
    expect(await t.mutation(api.app.cancel, { chain: 'offer:app1' })).toBe(0)
  })

  test('sends from one line are paced, one drain at a time, and named files are fetched once', async () => {
    const { t, connect, settle } = await setup()
    await connect()
    for (const to of ['a@example.org', 'b@example.org', 'c@example.org']) await t.mutation(api.app.offer, { to, attachments: ['guide', 'none'] })
    await settle()
    expect(google.sent.map((m) => m.to[0])).toEqual(['a@example.org', 'b@example.org', 'c@example.org'])
    expect(google.sent[0].attachments).toEqual([{ filename: 'Guide.pdf', contentType: 'application/pdf', size: 4 }])
    expect(slept).toEqual([1500, 1500])
  })

  test('a file that can’t be fetched fails the email, not the line', async () => {
    const { t, connect, later, settle, log } = await setup()
    await connect()
    await t.mutation(api.app.offer, { to: 'ana@example.org', attachments: ['broken'] })
    await settle()
    for (const m of [1, 5, 25]) await later(m * MINUTE)
    expect((await log())[0]).toMatchObject({ status: 'failed', error: expect.stringContaining('The guide link is broken') })
    expect((await t.query(api.mailAdmin.senders, { auth: ADMIN })).senders.find((s) => s.key === 'welcome')!.sender!.lastError).toBeNull()
  })

  test('a drain that crashed leaves its claim; the next one takes over when the lease runs out', async () => {
    const { t, connect, later, log } = await setup()
    await connect()
    // A drain claims the email and dies before sending: the row stays "sending" with the lease held.
    await t.run(async (ctx) => {
      const queued = await ctx.runMutation(app.components.mail.messages.enqueue, {
        kind: 'demo.offer',
        senderKey: 'welcome',
        senderTitle: 'Emails to registrants',
        to: ['ana@example.org'],
        subject: 'Your offer',
        html: '<p>x</p>',
        text: 'x',
        now: Date.now(),
      })
      // Its drain was never scheduled: this claim is that drain's, which then dies.
      const claim = await ctx.runMutation(app.components.mail.drain.claim, { senderKey: 'welcome', senderTitle: 'x', leaseId: queued.drain!.leaseId, batch: 5, now: Date.now() })
      expect(claim.state).toBe('claimed')
    })
    // Another email arrives: the dead drain's lease is still live, so no new drain yet.
    await t.mutation(api.app.offer, { to: 'ben@example.org' })
    await later(1)
    expect(google.sent).toEqual([])
    await later(4 * MINUTE)
    expect(google.sent.map((m) => m.to[0]).sort()).toEqual(['ana@example.org', 'ben@example.org'])
    expect((await log()).every((m) => m.status === 'sent')).toBe(true)
  })

  test('“Retry failed emails” queues the line’s failures again once it is connected', async () => {
    const { t, connect, settle, log, outcomes } = await setup()
    await t.mutation(api.app.offer, { to: 'ana@example.org' })
    await expect(t.mutation(api.mailAdmin.retryFailed, { auth: ADMIN, senderKey: 'welcome' })).rejects.toThrow(/Connect a Google account/)
    await connect()
    expect(await t.mutation(api.mailAdmin.retryFailed, { auth: ADMIN, senderKey: 'welcome' })).toBe(1)
    await settle()
    expect((await log())[0]).toMatchObject({ status: 'sent' })
    expect((await outcomes()).map((o) => o.ok)).toEqual([false, true])
  })

  test('the log resends a stored copy, but not an email that has to be rebuilt', async () => {
    const { t, connect, settle, log } = await setup()
    await connect('accounts')
    const sent = await t.action(api.app.sendNow, { to: 'ana@example.org' })
    expect(sent.ok).toBe(true)
    await t.mutation(api.mailAdmin.resend, { auth: ADMIN, id: sent.id })
    await settle()
    expect(google.sent.map((m) => m.subject)).toEqual(['Invoice', 'Invoice'])
    expect((await log())[0]).toMatchObject({ resendOf: sent.id, by: 'Admin', status: 'sent' })

    await connect('welcome', 'c2')
    const offer = await t.mutation(api.app.offer, { to: 'ana@example.org' })
    await settle()
    await expect(t.mutation(api.mailAdmin.resend, { auth: ADMIN, id: offer })).rejects.toThrow(/send it again from where it belongs/)
  })

  test('sendNow sends once and logs names and sizes of files, which can’t be resent', async () => {
    const { t, connect, log } = await setup()
    expect(await t.action(api.app.sendNow, { to: 'ana@example.org' })).toMatchObject({ ok: false, error: expect.stringContaining('Account emails') })
    await connect('accounts')
    const res = await t.action(api.app.sendNow, { to: 'ana@example.org', withFile: true })
    expect(res.ok).toBe(true)
    expect(google.sent[0]).toMatchObject({ text: 'Attached.\n\nThanks', attachments: [{ filename: 'Invoice.pdf', contentType: 'application/pdf', size: 3 }] })
    // Typed as plain text: framed like every other email.
    expect(google.sent[0].html).toBe(emailShell('<p>Attached.</p>\n<p>Thanks</p>'))
    expect((await log())[0]).toMatchObject({ status: 'sent', files: [{ filename: 'Invoice.pdf', size: 3 }] })
    await expect(t.mutation(api.mailAdmin.resend, { auth: ADMIN, id: res.id })).rejects.toThrow(/files attached/)
  })

  test('a test email goes to the admin pressing the button', async () => {
    const { t, connect, settle } = await setup()
    await connect()
    await t.mutation(api.mailAdmin.sendTest, { auth: ADMIN, senderKey: 'welcome' })
    await settle()
    expect(google.sent[0]).toMatchObject({ to: ['admin@example.org'], subject: 'Test email: Emails to registrants' })
  })

  test('the letter editor’s test sends its preview, as it is, from the kind’s line', async () => {
    const { t, connect, settle } = await setup()
    await connect()
    const html = '<table><tr><td><p>Hi Ana, <a href="https://example.org/x">take it</a></p></td></tr></table>'
    await t.mutation(api.mailAdmin.sendTest, { auth: ADMIN, senderKey: 'welcome', letter: { subject: 'Your offer, Ana', html } })
    await settle()
    expect(google.sent[0]).toMatchObject({ to: ['admin@example.org'], subject: 'Test: Your offer, Ana' })
    expect(google.sent[0].html).toContain('<table>')
  })

  test('recipients are checked; the log is searched by address', async () => {
    const { t, connect } = await setup()
    await expect(t.mutation(api.app.offer, { to: 'not an address' })).rejects.toThrow(/isn’t an email address/)
    await connect()
    await t.mutation(api.app.offer, { to: 'ana@example.org' })
    await t.mutation(api.app.offer, { to: 'ben@example.org' })
    const found = await t.query(api.mailAdmin.searchMessages, { auth: STAFF, text: 'ben@example.org' })
    expect(found.map((m) => m.to[0])).toEqual(['ben@example.org'])
  })
})

describe('wording', () => {
  test('saving cleans the HTML and checks the placeholders; reset goes back to the built-in', async () => {
    const { t } = await setup()
    await expect(t.mutation(api.mailAdmin.saveText, { auth: ADMIN, kind: 'demo.offer', subject: 'Hi', body: '<p>No link</p>' })).rejects.toThrow('It must include {link}.')
    await expect(t.mutation(api.mailAdmin.saveText, { auth: ADMIN, kind: 'demo.offer', subject: 'Hi', body: '<p>{link} {nope}</p>' })).rejects.toThrow(/\{nope\}/)
    await expect(t.mutation(api.mailAdmin.saveText, { auth: ADMIN, kind: 'demo.offer', subject: ' ', body: '<p>{link}</p>' })).rejects.toThrow(/subject/)
    const stored = await t.mutation(api.mailAdmin.saveText, {
      auth: ADMIN,
      kind: 'demo.offer',
      subject: ' Hi  {first_name} ',
      body: '<p onclick="x()">Go: <a href="{link}">here</a></p><script>x</script>',
    })
    // Returned as stored, so the editor shows the cleaned text rather than what was typed.
    expect(stored).toEqual({ subject: 'Hi {first_name}', body: '<p>Go: <a href="{link}">here</a></p>&lt;script&gt;x&lt;/script&gt;' })
    expect(await t.query(api.app.text, { kind: 'demo.offer' })).toEqual({ ...stored, custom: true })
    const texts = await t.query(api.mailAdmin.texts, { auth: ADMIN })
    expect(texts.map((x) => x.kind)).toEqual(['demo.offer', 'demo.info'])
    expect(texts[0]).toMatchObject({ custom: true, updatedBy: 'Admin', builtIn: { subject: 'Your offer, {first_name}' } })
    await t.mutation(api.mailAdmin.resetText, { auth: ADMIN, kind: 'demo.offer' })
    expect(await t.query(api.app.text, { kind: 'demo.offer' })).toMatchObject({ subject: 'Your offer, {first_name}', custom: false })
  })

  test('a text that isn’t an email has no subject', async () => {
    const { t } = await setup()
    await t.mutation(api.mailAdmin.saveText, { auth: ADMIN, kind: 'demo.info', subject: 'ignored', body: '<p>Six hours.</p>' })
    expect(await t.query(api.app.text, { kind: 'demo.info' })).toEqual({ subject: '', body: '<p>Six hours.</p>', custom: true })
  })
})

describe('keeping and reporting', () => {
  test('cleanup deletes messages and bodies past the retention days, and keeps what is still queued', async () => {
    const { t, connect, settle, log } = await setup()
    await t.mutation(api.mailAdmin.updateSettings, { auth: ADMIN, retentionDays: 30 })
    await connect()
    google.refuse(() => gmailUnavailable())
    await t.mutation(api.app.offer, { to: 'old@example.org' })
    await settle()
    google.refuse()
    const queued = await t.run(async (ctx) =>
      ctx.runMutation(app.components.mail.messages.enqueue, { kind: 'demo.offer', senderKey: 'welcome', senderTitle: 'x', to: ['q@example.org'], subject: 's', html: 'h', text: 't', now: Date.now() }),
    )
    void queued
    vi.setSystemTime(Date.now() + 31 * 24 * 60 * MINUTE)
    await t.run(async (ctx) => {
      // The first one is sent long ago; the stuck one stays queued.
      const sent = (await ctx.runQuery(app.components.mail.messages.search, { text: 'old@example.org' }))[0]
      expect(sent).toBeTruthy()
    })
    await t.mutation(api.mailAdmin.updateSettings, { auth: ADMIN, retentionDays: 30 })
    // Settle the old one as failed so it can be deleted.
    await t.run(async (ctx) => {
      const [m] = await ctx.runQuery(app.components.mail.messages.search, { text: 'old@example.org' })
      await ctx.runMutation(app.components.mail.messages.finish, { id: m.id, error: 'gave up', now: Date.now() })
    })
    expect(await t.mutation(api.app.cleanup, {})).toEqual({ deleted: 1, more: false })
    expect((await log()).map((m) => m.to[0])).toEqual(['q@example.org'])
    expect(await t.run(async (ctx) => (await ctx.runQuery(app.components.mail.messages.search, { text: 'old' })).length)).toBe(0)
  })

  test('settings are checked', async () => {
    const { t } = await setup()
    expect(await t.query(api.mailAdmin.settings, { auth: ADMIN })).toEqual({ retentionDays: 183, digestTo: '', retryMinutes: [1, 5, 25] })
    await expect(t.mutation(api.mailAdmin.updateSettings, { auth: ADMIN, retentionDays: 0 })).rejects.toThrow(/whole number of days/)
    await expect(t.mutation(api.mailAdmin.updateSettings, { auth: ADMIN, digestTo: 'nope' })).rejects.toThrow(/email address/)
  })

  test('the digest reports each failure once, from a healthy sender, and never its own failures', async () => {
    const { t, connect, settle, later } = await setup()
    await connect('accounts')
    // No address set: no report.
    await t.mutation(api.app.offer, { to: 'ana@example.org' })
    expect(await t.action(api.app.digest, {})).toBeNull()
    await t.mutation(api.mailAdmin.updateSettings, { auth: ADMIN, digestTo: 'office@example.org' })
    expect(await t.query(api.mailAdmin.failureCount, { auth: STAFF })).toBe(1)
    expect(await t.action(api.app.digest, {})).toEqual({ sent: 1 })
    const report = google.sent.at(-1)!
    expect(report).toMatchObject({ to: ['office@example.org'], subject: '1 email failed' })
    expect(report.html).toContain('No Google account is connected for Emails to registrants')
    expect(report.html).toContain('https://app.example.org/admin/email?tab=log')
    expect(await t.action(api.app.digest, {})).toBeNull()

    // The report itself fails: it isn't reported, and the failure it carried waits for the next one.
    await t.mutation(api.app.offer, { to: 'ben@example.org' })
    google.refuse(() => gmailUnavailable())
    expect(await t.action(api.app.digest, {})).toBeNull()
    google.refuse()
    expect(await t.action(api.app.digest, {})).toEqual({ sent: 1 })
    expect(google.sent.at(-1)!.html).toContain('ben@example.org')
    void settle
    void later
  })
})

/** A refresh token Google will refuse, encrypted as the library stores them. */
async function encryptBroken() {
  const { encryptToken } = await import('../core/tokenCrypt.js')
  return encryptToken('client-secret', 'revoked-token')
}
