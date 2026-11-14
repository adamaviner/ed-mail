import { useEffect, useState } from 'react'
import type { KindSpec, MailConfig } from '../../core/config.js'

export const kindsOf = (config: MailConfig) => config.kinds as Readonly<Record<string, KindSpec>>
export const sendersOf = (config: MailConfig) => config.senders as Readonly<Record<string, { title: string }>>

/** The kinds a sender line sends, in the config's order. The test email is left out: it's only ever an admin's own. */
export const kindsFrom = (config: MailConfig, senderKey: string) => Object.entries(kindsOf(config)).filter(([kind, k]) => k.sender === senderKey && kind !== 'mail.test')

export const kindTitle = (config: MailConfig, kind: string) => kindsOf(config)[kind]?.title ?? kind
export const senderTitle = (config: MailConfig, key: string) => sendersOf(config)[key]?.title ?? key

export const dateTime = (ms: number) => new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** `value` once it has stopped changing for `ms`, so a search box doesn't start a query per keystroke. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}
