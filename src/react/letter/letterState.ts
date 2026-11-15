// The letter editor's decisions as plain functions, so they can be tested without a browser: when
// edits follow the saved letter, whether Save may run and why not, and the line beside the buttons.
import { type KindSpec, textProblem } from '../../core/config.js'
import { type Letter, missingPlaceholders, unknownPlaceholders } from '../../core/template.js'

export const sameLetter = (a: Letter, b: Letter) => a.subject === b.subject && a.body === b.body

/**
 * The fields once the saved letter changes from `before` to `after` (a save or reset here, or
 * another admin's): untouched fields follow it, edits stay.
 */
export function followSaved(fields: Letter, before: Letter, after: Letter): Letter {
  return sameLetter(fields, before) ? after : fields
}

/** `text` put in place of value[start, end). */
export const spliceText = (value: string, start: number, end: number, text: string) => value.slice(0, start) + text + value.slice(end)

export interface PlaceholderCheck {
  /** Placeholders the kind doesn't have (typos): they'd go out as typed. */
  unknown: string[]
  /** Placeholders the kind requires that the letter leaves out. */
  missing: string[]
}

export function checkPlaceholders(spec: KindSpec, letter: Letter): PlaceholderCheck {
  const text = spec.text
  if (!text) return { unknown: [], missing: [] }
  return { unknown: unknownPlaceholders(letter, new Set(text.placeholders.map((p) => p.key))), missing: missingPlaceholders(letter, text.required ?? []) }
}

/** Why Save can't run now, or null when it can. Placeholder problems point at their notes, which say more. */
export function saveBlocker(spec: KindSpec, fields: Letter, dirty: boolean): string | null {
  if (!dirty) return 'Nothing has changed.'
  const { unknown, missing } = checkPlaceholders(spec, fields)
  if (unknown.length || missing.length) return 'Fix the placeholders noted above first.'
  return textProblem(spec, fields)
}

/** The line beside the buttons: unsaved, saved by whom and when, or the built-in wording. */
export function statusText(o: { dirty: boolean; custom: boolean; updatedBy: string | null; updatedAt: number | null }): string {
  if (o.dirty) return 'Unsaved changes.'
  if (!o.custom) return 'The built-in wording.'
  const when = o.updatedAt ? `, ${new Date(o.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''
  return `Saved${o.updatedBy ? ` by ${o.updatedBy}` : ''}${when}.`
}
