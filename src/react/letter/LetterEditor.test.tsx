// @vitest-environment happy-dom
// The editor's save / undo / reset / test logic against a fake admin api. The TipTap body editor is
// swapped for a plain textarea: what's under test is the form around it.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { defineMailConfig } from '../../core/config.js'
import type { Letter } from '../../core/template.js'
import type { MailAdminApi, MailSenders, MailText } from '../types.js'
import { LetterEditor } from './LetterEditor.js'

vi.mock('../editor/RichEmailEditor.js', () => ({
  RichEmailEditor: ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <textarea aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

// A tiny stand-in for Convex: queries read `server`, mutations are spies that change it and re-render.
const server: { texts: MailText[]; senders: MailSenders } = { texts: [], senders: { googleReady: true, redirectUri: '', senders: [] } }
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((l) => l())
const mutations = {
  saveText: vi.fn(),
  resetText: vi.fn(),
  sendTest: vi.fn(),
}

vi.mock('convex/react', async () => {
  const { useEffect, useReducer } = await import('react')
  return {
    useQuery: (ref: string) => {
      const [, bump] = useReducer((n: number) => n + 1, 0)
      useEffect(() => {
        listeners.add(bump)
        return () => void listeners.delete(bump)
      }, [])
      return ref === 'texts' ? server.texts : ref === 'senders' ? server.senders : undefined
    },
    useMutation: (ref: keyof typeof mutations) => mutations[ref],
  }
})

const api = { texts: 'texts', senders: 'senders', saveText: 'saveText', resetText: 'resetText', sendTest: 'sendTest' } as unknown as MailAdminApi
const auth = { token: 't' }

const config = defineMailConfig({
  senders: { wexers: { title: 'Event wexers' } },
  kinds: {
    'wexers.approved': {
      sender: 'wexers',
      title: 'Work exchange: approved',
      when: 'When staff approve.',
      text: {
        builtIn: { subject: 'You’re in, {name}', body: '<p>Register: {registration_link}</p>' },
        placeholders: [
          { key: 'name', label: 'Name' },
          { key: 'registration_link', label: 'Registration link' },
        ],
        required: ['registration_link'],
        sample: { name: 'Sam', registration_link: 'https://example.org/r' },
      },
    },
  },
})
const builtIn = config.kinds['wexers.approved'].text!.builtIn

function savedText(letter: Letter | null): MailText {
  return { kind: 'wexers.approved', ...(letter ?? builtIn), custom: !!letter, updatedAt: letter ? Date.UTC(2026, 10, 1, 15) : null, updatedBy: letter ? 'Ann' : null, builtIn }
}

beforeEach(() => {
  server.texts = [savedText(null)]
  server.senders = {
    googleReady: true,
    redirectUri: '',
    senders: [
      {
        key: 'wexers',
        title: 'Event wexers',
        sender: { key: 'wexers', account: 'wex@example.org', fromEmail: null, fromName: 'Earthdance', replyTo: null, connectedAt: 0, connectedBy: null, lastError: null, lastErrorAt: null },
      },
    ],
  }
  mutations.saveText.mockImplementation(async ({ subject, body }: Letter) => {
    // The server trims and cleans what it stores.
    const stored = { subject: subject.trim(), body }
    server.texts = [savedText(stored)]
    changed()
    return stored
  })
  mutations.resetText.mockImplementation(async () => {
    server.texts = [savedText(null)]
    changed()
  })
  mutations.sendTest.mockResolvedValue('m1')
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const renderEditor = () => render(<LetterEditor api={api} auth={auth} config={config} kind="wexers.approved" />)
const subject = () => screen.getByLabelText('Subject') as HTMLInputElement
const body = () => screen.getByLabelText('Body') as HTMLTextAreaElement
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement

test('Save is disabled until something changes, then saves what was typed', async () => {
  renderEditor()
  expect(screen.getByText('The built-in wording.')).toBeTruthy()
  expect(button(/Save/).disabled).toBe(true)
  fireEvent.change(subject(), { target: { value: 'Welcome aboard, {name} ' } })
  expect(screen.getByText('Unsaved changes.')).toBeTruthy()
  fireEvent.click(button(/Save/))
  await waitFor(() => expect(screen.getByText('Saved. Emails from now on use this wording.')).toBeTruthy())
  expect(mutations.saveText).toHaveBeenCalledWith({ auth, kind: 'wexers.approved', subject: 'Welcome aboard, {name} ', body: builtIn.body })
  // What the server stored (trimmed) is in the field, and nothing is left unsaved.
  expect(subject().value).toBe('Welcome aboard, {name}')
  expect(screen.getByText('Saved by Ann, Nov 1, 2026.')).toBeTruthy()
  expect(button(/Save/).disabled).toBe(true)
})

test('Undo changes goes back to the saved wording', () => {
  renderEditor()
  fireEvent.change(body(), { target: { value: '<p>Other {registration_link}</p>' } })
  fireEvent.click(button('Undo changes'))
  expect(body().value).toBe(builtIn.body)
  expect(screen.queryByRole('button', { name: 'Undo changes' })).toBeNull()
})

test('an unknown placeholder or a missing required one stops the save, with the reason', () => {
  renderEditor()
  fireEvent.change(body(), { target: { value: '<p>Register: {registraton_link}</p>' } })
  expect(screen.getByText(/The app doesn’t know \{registraton_link\}/)).toBeTruthy()
  expect(screen.getByText(/must include \{registration_link\}/)).toBeTruthy()
  expect(button(/Save/).disabled).toBe(true)
  expect(screen.getByText(/Fix the placeholders noted above first\./)).toBeTruthy()
  fireEvent.click(button(/Save/))
  expect(mutations.saveText).not.toHaveBeenCalled()
})

test('Reset to built-in asks once more, then resets and shows the built-in wording', async () => {
  server.texts = [savedText({ subject: 'Custom {name}', body: '<p>Mine {registration_link}</p>' })]
  renderEditor()
  // An unsaved edit on top is thrown away too.
  fireEvent.change(subject(), { target: { value: 'Edited' } })
  fireEvent.click(button(/Reset to built-in/))
  expect(mutations.resetText).not.toHaveBeenCalled()
  fireEvent.click(button(/Reset this wording/))
  await waitFor(() => expect(screen.getByText('Back to the built-in wording.')).toBeTruthy())
  expect(mutations.resetText).toHaveBeenCalledWith({ auth, kind: 'wexers.approved' })
  expect(subject().value).toBe(builtIn.subject)
  expect(screen.queryByRole('button', { name: /Reset to built-in/ })).toBeNull()
})

test('Compare with built-in shows only when the wording differs, and can start from the built-in', () => {
  renderEditor()
  expect(screen.queryByRole('button', { name: /Compare with built-in/ })).toBeNull()
  fireEvent.change(subject(), { target: { value: 'Changed {name}' } })
  fireEvent.click(button(/Compare with built-in/))
  fireEvent.click(button(/Start from the built-in/))
  expect(subject().value).toBe(builtIn.subject)
})

test('Send test to me sends the preview from the kind’s sender', async () => {
  renderEditor()
  expect(screen.getByText('Earthdance <wex@example.org>')).toBeTruthy()
  fireEvent.click(button(/Send test to me/))
  await waitFor(() => expect(screen.getByText('A test is on its way to your email address.')).toBeTruthy())
  const args = mutations.sendTest.mock.calls[0][0]
  expect(args.senderKey).toBe('wexers')
  expect(args.letter.subject).toBe('You’re in, Sam')
  expect(args.letter.html).toContain('https://example.org/r')
})

test('without a connected sender it warns, and the test can’t be sent', () => {
  server.senders = { ...server.senders, senders: [{ key: 'wexers', title: 'Event wexers', sender: null }] }
  const onChangeSender = vi.fn()
  render(<LetterEditor api={api} auth={auth} config={config} kind="wexers.approved" onChangeSender={onChangeSender} />)
  expect(screen.getByText(/no Google account is connected for event wexers/)).toBeTruthy()
  expect(button(/Send test to me/).disabled).toBe(true)
  fireEvent.click(button('connect one'))
  expect(onChangeSender).toHaveBeenCalled()
})

test('tells the app when it has unsaved changes', () => {
  const onDirtyChange = vi.fn()
  const { unmount } = render(<LetterEditor api={api} auth={auth} config={config} kind="wexers.approved" onDirtyChange={onDirtyChange} />)
  fireEvent.change(subject(), { target: { value: 'x {name}' } })
  expect(onDirtyChange).toHaveBeenLastCalledWith(true)
  unmount()
  expect(onDirtyChange).toHaveBeenLastCalledWith(false)
})
