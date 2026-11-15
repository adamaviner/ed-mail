import { afterEach, describe, expect, test, vi } from 'vitest'
import { defineMailConfig, textProblem } from './config.js'
import { GoogleError, accessToken, exchangeCode } from './google.js'
import { buildMime } from './mime.js'
import { bodyHtml, fillTemplate, missingPlaceholders, placeholdersIn, unknownPlaceholders } from './template.js'
import { textToHtml } from './text.js'
import { decryptToken, encryptToken } from './tokenCrypt.js'
import { fakeGoogle, parseMime } from '../testing/fakeGoogle.js'

afterEach(() => vi.unstubAllGlobals())

describe('mime', () => {
  test('headers, encoded subject and names, alternative parts, attachments', () => {
    const raw = buildMime(
      {
        from: { email: 'welcome@earthdance.net', name: 'Earthdance' },
        to: ['a@example.org'],
        cc: ['b@example.org'],
        replyTo: 'contact@earthdance.net',
        subject: 'Welcome — see you soon',
        html: '<p>Hi</p>',
        text: 'Hi',
        attachments: [{ filename: 'Invoice.pdf', contentType: 'application/pdf', data: new Uint8Array([1, 2, 3]) }],
      },
      'B',
    )
    expect(raw).toContain('From: "Earthdance" <welcome@earthdance.net>\r\n')
    expect(raw).toContain('Cc: b@example.org\r\n')
    expect(raw).toContain('Reply-To: contact@earthdance.net\r\n')
    expect(raw).toMatch(/Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=\r\n/)
    expect(raw).toContain('Content-Type: multipart/mixed; boundary="mixed_B"')
    expect(raw).toContain(`Content-Disposition: attachment; filename="Invoice.pdf"\r\n\r\nAQID`)
    expect(raw.trimEnd().endsWith('--mixed_B--')).toBe(true)
    expect(parseMime(raw)).toEqual({
      from: '"Earthdance" <welcome@earthdance.net>',
      to: ['a@example.org'],
      cc: ['b@example.org'],
      replyTo: 'contact@earthdance.net',
      subject: 'Welcome — see you soon',
      html: '<p>Hi</p>',
      text: 'Hi',
      attachments: [{ filename: 'Invoice.pdf', contentType: 'application/pdf', size: 3 }],
    })
  })

  test('no header injection through names or addresses', () => {
    const raw = buildMime({ from: { email: 'x@example.org', name: 'Evil\r\nBcc: a@b.c' }, to: ['y@example.org\r\nBcc: z@b.c'], subject: 'S\r\nBcc: q@b.c', html: '' }, 'B')
    expect(raw).not.toMatch(/\r\nBcc:/)
  })
})

describe('tokens and Google', () => {
  test('tokens are stored encrypted, and only the same secret opens them', async () => {
    const sealed = await encryptToken('secret', 'refresh-token')
    expect(sealed).not.toContain('refresh-token')
    expect(await decryptToken('secret', sealed)).toBe('refresh-token')
    await expect(decryptToken('other', sealed)).rejects.toThrow()
  })

  test('the code is exchanged for a refresh token and the account; a revoked grant is an auth error', async () => {
    const google = fakeGoogle({ email: 'Office@Example.org' })
    vi.stubGlobal('fetch', google.fetch)
    const client = { id: 'id', secret: 'secret' }
    const scope = 'https://www.googleapis.com/auth/gmail.send' as const
    expect(await exchangeCode({ client, redirectUri: 'https://x/cb', code: 'c9', scope })).toEqual({ refreshToken: 'refresh-c9', email: 'office@example.org' })
    expect(await accessToken(client, 'refresh-c9')).toEqual({ token: 'access-1', expiresAt: expect.any(Number) })
    const err = await accessToken(client, 'revoked').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(GoogleError)
    expect((err as GoogleError).auth).toBe(true)
  })
})

describe('templates', () => {
  test('placeholders: found, unknown, missing', () => {
    const t = { subject: 'Hi {first_name}', body: '<p>{link} {first_name} {oops}</p><style>a { color: red }</style>' }
    expect(placeholdersIn(t)).toEqual(['first_name', 'link', 'oops'])
    expect(unknownPlaceholders(t, new Set(['first_name', 'link']))).toEqual(['oops'])
    expect(missingPlaceholders(t, ['link', 'code'])).toEqual(['code'])
  })

  test('fills text escaped, blocks as HTML, and drops empty paragraphs', () => {
    const out = fillTemplate({
      subject: 'For {name}\n',
      body: '<p>Dear {name},</p><p>{list}</p><p>Pay here: {pay}</p>',
      values: { name: 'Ana <3', list: '<ul><li>One</li></ul>', pay: '' },
      known: new Set(['name', 'list', 'pay']),
      blocks: new Set(['list']),
      dropParagraph: ['pay'],
    })
    expect(out).toEqual({ subject: 'For Ana <3', body: '<p>Dear Ana &lt;3,</p><ul><li>One</li></ul>' })
  })

  test('plain text becomes paragraphs', () => {
    expect(bodyHtml('One\nline\n\nTwo')).toBe('<p>One<br>\nline</p>\n<p>Two</p>')
    expect(textToHtml('A & B\n\nC')).toBe('<p>A &amp; B</p>\n<p>C</p>')
  })
})

describe('config', () => {
  const offer = {
    sender: 'welcome' as const,
    title: 'Offer',
    when: 'x',
    text: { builtIn: { subject: 'S', body: '<p>{link}</p>' }, placeholders: [{ key: 'link', label: 'Link' }], required: ['link'] },
  }

  test('adds the library’s kinds and checks the built-in texts', () => {
    const config = defineMailConfig({ senders: { welcome: { title: 'W' } }, kinds: { offer } })
    expect(Object.keys(config.kinds)).toEqual(['offer', 'mail.test', 'mail.digest'])
    expect(config.digestSender).toBe('welcome')
    expect(() => defineMailConfig({ senders: { welcome: { title: 'W' } }, kinds: { offer: { ...offer, text: { ...offer.text, builtIn: { subject: 'S', body: 'no link' } } } } })).toThrow(
      /must include \{link\}/,
    )
    expect(() => defineMailConfig({ senders: { welcome: { title: 'W' } }, kinds: { offer: { ...offer, text: { ...offer.text, required: ['nope'] } } } })).toThrow(/aren't among its placeholders/)
  })

  test('textProblem explains what blocks a save', () => {
    expect(textProblem(offer, { subject: '', body: '<p>{link}</p>' })).toBe('The email needs a subject.')
    expect(textProblem(offer, { subject: 'S', body: ' ' })).toBe('The text is empty.')
    expect(textProblem(offer, { subject: 'S', body: '<p>{link}</p>' })).toBeNull()
    // A block placeholder is HTML, so it can't be the subject, even when it is also in the body.
    const button = { ...offer, text: { ...offer.text, placeholders: [{ key: 'link', label: 'Link', block: true }] } }
    expect(textProblem(button, { subject: 'Go: {link}', body: '<p>{link}</p>' })).toBe('{link} can only go in the body, not the subject.')
    expect(textProblem(button, { subject: 'Go', body: '<p>{link}</p>' })).toBeNull()
  })
})
