import { Mail } from '@earthdance/mail'
import { components, internal } from './_generated/api.js'
import { mailConfig } from './mailConfig.js'

// Annotated, so TypeScript doesn't go round in a circle through mailWorker.ts.
export const mail: Mail<typeof mailConfig> = new Mail(components.mail, {
  config: mailConfig,
  google: () => (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET } : null),
  encryptionSecret: () => process.env.GOOGLE_CLIENT_SECRET,
  siteUrl: () => process.env.CONVEX_SITE_URL ?? '',
  afterConnect: ({ senderKey, error }) => `http://localhost:5173/admin/email?${error ? `error=${encodeURIComponent(error)}` : `connected=${senderKey}`}`,
  worker: internal.mailWorker,
})
