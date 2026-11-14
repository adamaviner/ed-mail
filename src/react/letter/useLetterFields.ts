import { useCallback, useRef, useState } from 'react'
import type { Letter } from '../../core/template.js'
import type { RichTextEditorHandle } from '../editor/RichTextEditor.js'
import { followSaved, sameLetter, spliceText } from './letterState.js'

export type LetterField = 'subject' | 'body'

/**
 * A letter's subject and body while they're edited, against the saved letter: whether they differ
 * (dirty), going back to it (undo), and putting a {placeholder} where the cursor was in whichever
 * field was used last. When the saved letter changes (a save, a reset, another admin), untouched
 * fields follow it and edits stay. Spread `subjectProps` on the subject input and `bodyProps` on
 * the RichEmailEditor.
 */
export function useLetterFields(saved: Letter, o: { hasSubject?: boolean } = {}) {
  const hasSubject = o.hasSubject ?? true
  const [fields, setFields] = useState<Letter>(saved)
  const [base, setBase] = useState<Letter>(saved)
  // Adjusting state to a new prop while rendering, as React recommends over an effect: no frame shows the stale fields.
  if (!sameLetter(saved, base)) {
    setBase(saved)
    setFields(followSaved(fields, base, saved))
  }
  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<RichTextEditorHandle>(null)
  const lastField = useRef<LetterField>('body')

  const setSubject = useCallback((subject: string) => setFields((f) => ({ ...f, subject })), [])
  const setBody = useCallback((body: string) => setFields((f) => ({ ...f, body })), [])

  /** Puts {key} where the cursor was, in the subject or body (whichever was used last). */
  const insert = (key: string) => {
    const text = `{${key}}`
    if (!hasSubject || lastField.current === 'body') {
      if (bodyRef.current) bodyRef.current.insert(text)
      else setBody(fields.body + text)
      return
    }
    const el = subjectRef.current
    const start = el?.selectionStart ?? fields.subject.length
    const end = el?.selectionEnd ?? fields.subject.length
    setSubject(spliceText(fields.subject, start, end, text))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + text.length, start + text.length)
    })
  }

  return {
    subject: fields.subject,
    body: fields.body,
    letter: fields,
    setSubject,
    setBody,
    /** Replaces both fields, e.g. with what a save stored or the built-in wording. */
    set: setFields,
    dirty: !sameLetter(fields, saved),
    /** Back to the saved letter. */
    undo: () => setFields(saved),
    insert,
    lastField,
    subjectProps: { ref: subjectRef, value: fields.subject, onChange: (e: { target: { value: string } }) => setSubject(e.target.value), onFocus: () => (lastField.current = 'subject') },
    bodyProps: { ref: bodyRef, value: fields.body, onChange: setBody, onFocus: () => (lastField.current = 'body') },
  }
}
