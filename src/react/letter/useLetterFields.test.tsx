// @vitest-environment happy-dom
import { act, render, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Letter } from '../../core/template.js'
import { useLetterFields } from './useLetterFields.js'

const saved: Letter = { subject: 'Hello {name}', body: '<p>Body</p>' }

test('starts as the saved letter, not dirty', () => {
  const { result } = renderHook(() => useLetterFields(saved))
  expect(result.current.letter).toEqual(saved)
  expect(result.current.dirty).toBe(false)
})

test('an edit makes it dirty; undo goes back to the saved letter', () => {
  const { result } = renderHook(() => useLetterFields(saved))
  act(() => result.current.setSubject('Hi'))
  expect(result.current.dirty).toBe(true)
  act(() => result.current.undo())
  expect(result.current.letter).toEqual(saved)
  expect(result.current.dirty).toBe(false)
})

test('untouched fields follow a new saved letter (another admin saved)', () => {
  const { result, rerender } = renderHook(({ s }) => useLetterFields(s), { initialProps: { s: saved } })
  const next = { subject: 'New', body: '<p>New</p>' }
  rerender({ s: next })
  expect(result.current.letter).toEqual(next)
  expect(result.current.dirty).toBe(false)
})

test('edits stay when the saved letter changes under them, and stay dirty', () => {
  const { result, rerender } = renderHook(({ s }) => useLetterFields(s), { initialProps: { s: saved } })
  act(() => result.current.setBody('<p>Mine</p>'))
  rerender({ s: { subject: 'New', body: '<p>New</p>' } })
  expect(result.current.letter).toEqual({ subject: 'Hello {name}', body: '<p>Mine</p>' })
  expect(result.current.dirty).toBe(true)
})

test('after a save, set() with what was stored leaves it clean once the saved letter arrives', () => {
  const { result, rerender } = renderHook(({ s }) => useLetterFields(s), { initialProps: { s: saved } })
  act(() => result.current.setBody('<p>Mine <span>x</span></p>'))
  // The server cleaned the body (safeHtml), so what's stored differs from what was typed.
  const stored = { subject: 'Hello {name}', body: '<p>Mine &lt;span&gt;x&lt;/span&gt;</p>' }
  rerender({ s: stored })
  act(() => result.current.set(stored))
  expect(result.current.letter).toEqual(stored)
  expect(result.current.dirty).toBe(false)
})

test('insert puts a placeholder at the subject’s cursor when the subject was used last', () => {
  function Subject({ onReady }: { onReady: (f: ReturnType<typeof useLetterFields>) => void }) {
    const f = useLetterFields(saved)
    onReady(f)
    return <input aria-label="Subject" {...f.subjectProps} />
  }
  let fields!: ReturnType<typeof useLetterFields>
  const { getByLabelText } = render(<Subject onReady={(f) => (fields = f)} />)
  const input = getByLabelText('Subject') as HTMLInputElement
  act(() => {
    input.focus()
    input.setSelectionRange(5, 5)
  })
  act(() => fields.insert('when'))
  expect(fields.subject).toBe('Hello{when} {name}')
})

test('insert goes to the body when there is no subject (a form text)', () => {
  const { result } = renderHook(() => useLetterFields({ subject: '', body: '<p>A</p>' }, { hasSubject: false }))
  result.current.lastField.current = 'subject'
  // No editor is mounted here, so the placeholder goes at the end.
  act(() => result.current.insert('x'))
  expect(result.current.body).toBe('<p>A</p>{x}')
})
