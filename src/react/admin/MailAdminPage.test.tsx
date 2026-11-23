// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { defineMailConfig } from '../../core/config.js'
import type { MailAdminApi, MailMessage } from '../types.js'
import { MailAdminPage } from './MailAdminPage.js'

vi.mock('../editor/RichEmailEditor.js', () => ({
  RichEmailEditor: ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <textarea aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

const message: MailMessage = {
  id: 'm1' as MailMessage['id'],
  kind: 'demo.offer',
  senderKey: 'welcome',
  to: ['ana@example.org'],
  cc: [],
  replyTo: null,
  subject: 'Your offer, Ana',
  status: 'failed',
  attempts: 4,
  nextAttemptAt: null,
  warning: null,
  error: 'Gmail said no.',
  ref: { type: 'application', id: 'a1' },
  scope: null,
  attachments: [],
  files: [],
  by: null,
  createdAt: Date.UTC(2026, 10, 14, 15),
  sentAt: null,
  settledAt: null,
  resendOf: null,
}

const builtIn = { subject: 'Your offer, {first_name}', body: '<p>{link}</p>' }
const answers: Record<string, unknown> = {
  texts: [{ kind: 'demo.offer', ...builtIn, custom: false, updatedAt: null, updatedBy: null, builtIn }],
  senders: { googleReady: true, redirectUri: '', senders: [{ key: 'welcome', title: 'Emails to registrants', sender: null }] },
  failureCount: 1,
  settings: { retentionDays: 183, digestTo: '', retryMinutes: [1, 5, 25] },
  message: { message, html: '<p>Body</p>', text: 'Body' },
}
const asked: string[] = []

vi.mock('convex/react', () => ({
  useQuery: (ref: string, args: unknown) => {
    if (args === 'skip') return undefined
    asked.push(ref)
    return answers[ref]
  },
  usePaginatedQuery: (ref: string, args: unknown) => {
    if (args !== 'skip') asked.push(ref)
    return { results: [message], status: 'Exhausted', loadMore: () => {} }
  },
  useMutation: () => vi.fn(),
}))

const api = Object.fromEntries(['texts', 'senders', 'failureCount', 'settings', 'message', 'messages', 'searchMessages'].map((k) => [k, k])) as unknown as MailAdminApi
const config = defineMailConfig({
  senders: { welcome: { title: 'Emails to registrants' } },
  kinds: {
    'demo.offer': {
      sender: 'welcome',
      title: 'Offer',
      when: 'When approved.',
      resend: 'rebuild',
      text: {
        builtIn,
        placeholders: [
          { key: 'first_name', label: 'First name' },
          { key: 'link', label: 'Link' },
        ],
        required: ['link'],
      },
    },
  },
})

afterEach(() => {
  cleanup()
  asked.length = 0
})

test('for staff (showBodies false) it is the log only, and never asks for a body or an admin query', () => {
  render(<MailAdminPage api={api} auth={{}} config={config} tab="emails" onTabChange={() => {}} showBodies={false} refLink={() => <a href="/a1">The application</a>} />)
  expect(screen.queryByRole('tab')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /Your offer, Ana/ }))
  expect(screen.getAllByText('Gmail said no.').length).toBeGreaterThan(0)
  expect(screen.getByText('The application')).toBeTruthy()
  expect(screen.queryByTitle('The email as sent')).toBeNull()
  expect([...new Set(asked)]).toEqual(['messages'])
})

test('for admins the detail shows the body, and a rebuild kind points to where it belongs', () => {
  render(<MailAdminPage api={api} auth={{}} config={config} tab="log" onTabChange={() => {}} refLink={() => <a href="/a1">The application</a>} />)
  fireEvent.click(screen.getByRole('button', { name: /Your offer, Ana/ }))
  expect(screen.getByTitle('The email as sent')).toBeTruthy()
  expect(screen.getByText(/made afresh each time/)).toBeTruthy()
  expect(asked).toContain('message')
  expect(asked).toContain('settings')
})

test('the tab is the app’s: choosing one asks it to change; an editable email opens its editor', () => {
  const onTabChange = vi.fn()
  render(<MailAdminPage api={api} auth={{}} config={config} tab="emails" onTabChange={onTabChange} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Senders' }))
  expect(onTabChange).toHaveBeenCalledWith('senders')
  expect(screen.getByText('Built-in wording')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Edit/ }))
  expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe(builtIn.subject)
  expect(screen.getByText(/no Google account is connected/)).toBeTruthy()
})

test('leaving a letter with unsaved changes asks first', () => {
  const onTabChange = vi.fn()
  // happy-dom has no confirm().
  const confirm = vi.fn(() => false)
  window.confirm = confirm
  render(<MailAdminPage api={api} auth={{}} config={config} tab="emails" onTabChange={onTabChange} />)
  fireEvent.click(screen.getByRole('button', { name: /Edit/ }))
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Changed {first_name}' } })
  fireEvent.click(screen.getByRole('tab', { name: 'Senders' }))
  expect(confirm).toHaveBeenCalled()
  expect(onTabChange).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /All emails/ }))
  expect(screen.getByLabelText('Subject')).toBeTruthy()
  confirm.mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: /All emails/ }))
  expect(screen.queryByLabelText('Subject')).toBeNull()
})
