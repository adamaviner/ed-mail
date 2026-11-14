// A fake Google for tests: sign-in codes, token refreshes, Gmail sends and revokes, each recorded.
// It is a fetch function, so it works with any test runner:
//   const google = fakeGoogle({ fallback: myOtherFetch })
//   vi.stubGlobal('fetch', google.fetch)
// Refresh tokens it hands out start with "refresh-"; any other one is refused as invalid_grant.

export interface SentMail {
  from: string
  to: string[]
  cc: string[]
  replyTo?: string
  subject: string
  html: string
  text: string
  attachments: { filename: string; contentType: string; size: number }[]
  /** The access token it was sent with. */
  auth: string | null
  raw: string
}

export interface FakeGoogleOptions {
  /** The account that signs in. */
  email?: string
  /** The scopes Google grants on sign-in. */
  scope?: string
  /** Answers every other URL; without it, other URLs throw. */
  fallback?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
}

const decoder = new TextDecoder()
const fromBase64 = (s: string) => Uint8Array.from(atob(s.replace(/\s+/g, '')), (c) => c.charCodeAt(0))

/** RFC 2047 encoded words back to text. */
function headerValue(v: string): string {
  return v.replace(/=\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=/g, (_w, b64: string) => decoder.decode(fromBase64(b64)))
}

/** Reads back what lib/mime.ts builds: headers, the text and HTML parts, and attachments' names and sizes. */
export function parseMime(raw: string): Omit<SentMail, 'auth' | 'raw'> {
  const [head] = raw.split('\r\n\r\n')
  const header = (name: string) => {
    const m = new RegExp(`^${name}: (.*)$`, 'mi').exec(head)
    return m ? headerValue(m[1]) : undefined
  }
  const list = (name: string) =>
    (header(name) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  const parts = raw.split(/\r\n--[^\r\n]+\r\n/).slice(1)
  let html = ''
  let text = ''
  const attachments: SentMail['attachments'] = []
  for (const part of parts) {
    const [h, ...rest] = part.split('\r\n\r\n')
    const body = rest.join('\r\n\r\n').split('\r\n--')[0]
    const type = /Content-Type: ([^;\r\n]+)/i.exec(h)?.[1] ?? ''
    if (type.startsWith('multipart/')) continue
    const file = /filename="([^"]*)"/i.exec(h)?.[1]
    const bytes = fromBase64(body)
    if (file) attachments.push({ filename: headerValue(file), contentType: type, size: bytes.length })
    else if (type === 'text/html') html = decoder.decode(bytes)
    else if (type === 'text/plain') text = decoder.decode(bytes)
  }
  return { from: header('From') ?? '', to: list('To'), cc: list('Cc'), replyTo: header('Reply-To'), subject: header('Subject') ?? '', html, text, attachments }
}

export function fakeGoogle({ email = 'sender@example.org', scope = 'openid email https://www.googleapis.com/auth/gmail.send', fallback }: FakeGoogleOptions = {}) {
  const sent: SentMail[] = []
  const revoked: string[] = []
  /** How many access tokens were handed out. */
  let refreshes = 0
  /** Set to make Gmail refuse sends: a Response to answer instead, or nothing to send normally. */
  let refuse: ((mail: SentMail) => Response | undefined) | undefined
  const idToken = `x.${btoa(JSON.stringify({ email })).replace(/=+$/, '')}.y`

  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url === 'https://oauth2.googleapis.com/token') {
      const form = new URLSearchParams(String(init?.body))
      if (form.get('grant_type') === 'authorization_code') {
        return Response.json({ access_token: 'at', refresh_token: `refresh-${form.get('code')}`, id_token: idToken, scope })
      }
      if (!form.get('refresh_token')?.startsWith('refresh-')) return Response.json({ error: 'invalid_grant' }, { status: 400 })
      refreshes++
      return Response.json({ access_token: `access-${refreshes}`, expires_in: 3599 })
    }
    if (url.startsWith('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send')) {
      const raw = String(init?.body)
      const mail: SentMail = { ...parseMime(raw), auth: new Headers(init?.headers).get('authorization'), raw }
      const refused = refuse?.(mail)
      if (refused) return refused
      if (!mail.auth?.startsWith('Bearer access-')) return Response.json({ error: { message: 'Invalid Credentials' } }, { status: 401 })
      sent.push(mail)
      return Response.json({ id: `m${sent.length}` })
    }
    if (url.startsWith('https://oauth2.googleapis.com/revoke')) {
      revoked.push(new URL(url).searchParams.get('token')!)
      return new Response(null)
    }
    if (fallback) return fallback(input, init)
    throw new Error(`fakeGoogle: unexpected fetch ${url}`)
  }

  return {
    fetch,
    sent,
    revoked,
    get refreshes() {
      return refreshes
    },
    /** Makes Gmail answer with this instead of sending, for every send until called again with nothing. */
    refuse(fn?: (mail: SentMail) => Response | undefined) {
      refuse = fn
    },
  }
}

/** A Gmail answer for a temporary failure. */
export const gmailUnavailable = () => Response.json({ error: { message: 'Backend Error' } }, { status: 503 })
/** A Gmail answer for an access token Google no longer accepts. */
export const gmailUnauthorized = () => Response.json({ error: { message: 'Invalid Credentials' } }, { status: 401 })
