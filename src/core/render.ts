// A kind's letter filled in for one recipient, ready to send: what an app calls with the wording
// from mail.text(ctx, kind) and the recipient's values. The editor's preview fills the same way.
import type { TextSpec } from './config.js'
import { emailShell, htmlToText } from './emailHtml.js'
import { type Letter, fillTemplate, unknownPlaceholders } from './template.js'

export interface RenderedText {
  subject: string
  /** The whole email: styled inline, in its frame. */
  html: string
  /** The same as plain text, sent alongside. */
  text: string
  /** Placeholders left in as typed because the kind doesn't know them. */
  unknown: string[]
}

export interface RenderOptions {
  /** Fill-ins to mark in a preview (data-fill), showing an empty one as its {placeholder}. */
  marked?: (key: string) => boolean
}

/** The spec's placeholder keys, and which of them are blocks. */
export function specKeys(spec: TextSpec): { known: ReadonlySet<string>; blocks: ReadonlySet<string> } {
  return { known: new Set(spec.placeholders.map((p) => p.key)), blocks: new Set(spec.placeholders.filter((p) => p.block).map((p) => p.key)) }
}

/** Fills `letter` (the kind's saved or built-in wording) with `values`, in the email's frame. */
export function renderText(spec: TextSpec, letter: Letter, values: Readonly<Record<string, string>>, opts: RenderOptions = {}): RenderedText {
  const { known, blocks } = specKeys(spec)
  const filled = fillTemplate({ subject: letter.subject, body: letter.body, values: { ...values }, known, blocks, marked: opts.marked, dropParagraph: spec.dropParagraph })
  // A dropped paragraph leaves its line empty.
  const body = filled.body.replace(/\n{2,}/g, '\n')
  return { subject: filled.subject, html: emailShell(body), text: htmlToText(body), unknown: unknownPlaceholders(letter, known) }
}
