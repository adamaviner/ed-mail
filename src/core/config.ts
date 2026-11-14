// The registry of every email an app sends: which sender line it goes out on, what it's called in
// Admin, when it is sent, and, for letters whose wording an admin may change, the built-in wording
// and its placeholders. The app writes one with defineMailConfig in a pure module that both its
// Convex functions and its browser code import, so the Admin page, the log's labels and the
// server's checks all read the same list.
import { type Letter, missingPlaceholders, unknownPlaceholders } from './template.js'

export interface SenderSpec {
  /** What the sender line is called in Admin, e.g. "Emails to registrants". */
  title: string
}

export interface PlaceholderSpec {
  key: string
  /** The chip's label in the editor. */
  label: string
  /** The value is HTML blocks (a list, a table) and replaces its whole paragraph. */
  block?: boolean
}

export interface TextSpec {
  /** The wording used until an admin saves their own, and what "Reset to built-in" goes back to. */
  builtIn: Letter
  placeholders: readonly PlaceholderSpec[]
  /** Placeholders a saved text must keep (a personal link). */
  required?: readonly string[]
  /** Placeholders whose paragraph is left out when the value is empty. */
  dropParagraph?: readonly string[]
  /** Values for Admin's preview. */
  sample?: Readonly<Record<string, string>>
}

export interface KindSpec<S extends string = string> {
  sender: S
  title: string
  /** When it goes out, in a sentence, for Admin. */
  when: string
  /**
   * False for a text that uses the letter editor but isn't an email (a form's information text):
   * it has no subject and never appears in the log.
   */
  email?: boolean
  /**
   * How the log resends it. 'stored' sends the stored copy again. 'rebuild' is for emails whose
   * link can expire or whose status can change: the log links to the thing it belongs to, whose own
   * Resend builds it afresh. Default 'stored'.
   */
  resend?: 'rebuild' | 'stored'
  /** Present when an admin may change the wording. */
  text?: TextSpec
}

/** Kinds the library sends itself. */
export const BUILT_IN_KINDS = ['mail.test', 'mail.digest'] as const
export type BuiltInKind = (typeof BUILT_IN_KINDS)[number]

export interface MailConfig<S extends string = string, K extends string = string> {
  senders: Readonly<Record<S, SenderSpec>>
  kinds: Readonly<Record<K | BuiltInKind, KindSpec<S>>>
  /** The sender the daily failure digest goes out from (if it's broken, any healthy one is used). */
  digestSender: S
}

/** Checks the registry once, where it's defined, and adds the library's own kinds. */
export function defineMailConfig<S extends string, K extends string>(input: { senders: Record<S, SenderSpec>; kinds: Record<K, KindSpec<NoInfer<S>>>; digestSender?: NoInfer<S> }): MailConfig<S, K> {
  const senderKeys = Object.keys(input.senders) as S[]
  if (!senderKeys.length) throw new Error('The mail config needs at least one sender.')
  const digestSender = input.digestSender ?? senderKeys[0]
  for (const [key, kind] of Object.entries(input.kinds) as [string, KindSpec<S>][]) {
    if ((BUILT_IN_KINDS as readonly string[]).includes(key)) throw new Error(`The mail kind ${key} is the library's own.`)
    if (!(kind.sender in input.senders)) throw new Error(`The mail kind ${key} names an unknown sender, ${kind.sender}.`)
    const text = kind.text
    if (text) {
      const known = new Set(text.placeholders.map((p) => p.key))
      const unknown = [...(text.required ?? []), ...(text.dropParagraph ?? [])].filter((k) => !known.has(k))
      if (unknown.length) throw new Error(`The mail kind ${key} lists ${unknown.join(', ')}, which aren't among its placeholders.`)
      const problem = textProblem(kind, text.builtIn)
      if (problem) throw new Error(`The built-in text of ${key}: ${problem}`)
    }
  }
  const builtIn: Record<BuiltInKind, KindSpec<S>> = {
    'mail.test': { sender: digestSender, title: 'Test email', when: 'When an admin sends a test.' },
    'mail.digest': { sender: digestSender, title: 'Failed email report', when: 'Each morning, when an email failed since the last report.' },
  }
  return { senders: input.senders, kinds: { ...input.kinds, ...builtIn }, digestSender }
}

export const isBuiltInKind = (kind: string): kind is BuiltInKind => (BUILT_IN_KINDS as readonly string[]).includes(kind)

/** Why this wording can't be saved for the kind, or null when it can. */
export function textProblem(kind: KindSpec, t: Letter): string | null {
  const spec = kind.text
  if (!spec) return `${kind.title} has no wording to change.`
  if (kind.email !== false && !t.subject.trim()) return 'The email needs a subject.'
  if (!t.body.trim()) return 'The text is empty.'
  const unknown = unknownPlaceholders(t, new Set(spec.placeholders.map((p) => p.key)))
  if (unknown.length) return `It uses ${unknown.map((k) => `{${k}}`).join(', ')}, which the app doesn’t know. Fix or remove ${unknown.length === 1 ? 'it' : 'them'} first.`
  const missing = missingPlaceholders(t, spec.required ?? [])
  if (missing.length) return `It must include ${missing.map((k) => `{${k}}`).join(' and ')}.`
  return null
}
