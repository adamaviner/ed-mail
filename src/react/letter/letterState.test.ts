import { describe, expect, test } from 'vitest'
import { defineMailConfig } from '../../core/config.js'
import { checkPlaceholders, followSaved, saveBlocker, spliceText, statusText } from './letterState.js'
import { defaultPreview } from './preview.js'

const config = defineMailConfig({
  senders: { welcome: { title: 'Emails to registrants' } },
  kinds: {
    'chores.invite': {
      sender: 'welcome',
      title: 'Chore sign-up invite',
      when: 'When sign-up opens.',
      text: {
        builtIn: { subject: 'Pick your chores, {name}', body: '<p>Hello {name}.</p><p>{chores_link}</p><p>Note: {note}</p>' },
        placeholders: [
          { key: 'name', label: 'Name' },
          { key: 'chores_link', label: 'Link' },
          { key: 'note', label: 'Note' },
          { key: 'shifts', label: 'Shifts', block: true },
        ],
        required: ['chores_link'],
        dropParagraph: ['note'],
        sample: { name: 'Sam', chores_link: 'https://example.org/c/1' },
      },
    },
    'forms.info': {
      sender: 'welcome',
      title: 'Form text',
      when: 'On the form.',
      email: false,
      text: { builtIn: { subject: '', body: '<p>About this.</p>' }, placeholders: [] },
    },
  },
})
const invite = config.kinds['chores.invite']
const builtIn = invite.text!.builtIn

describe('followSaved', () => {
  const before = { subject: 'a', body: 'b' }
  const after = { subject: 'A', body: 'B' }
  test('untouched fields follow a new saved letter', () => {
    expect(followSaved(before, before, after)).toEqual(after)
  })
  test('edits stay when the saved letter changes under them', () => {
    const edited = { subject: 'mine', body: 'b' }
    expect(followSaved(edited, before, after)).toBe(edited)
  })
})

test('spliceText puts text in place of a selection', () => {
  expect(spliceText('Hello world', 6, 11, '{name}')).toBe('Hello {name}')
  expect(spliceText('Hi ', 3, 3, '{name}')).toBe('Hi {name}')
})

describe('checkPlaceholders', () => {
  test('lists unknown placeholders in subject and body, and required ones left out', () => {
    expect(checkPlaceholders(invite, { subject: 'Hi {nmae}', body: '<p>{typo}</p>' })).toEqual({ unknown: ['nmae', 'typo'], missing: ['chores_link'] })
  })
  test('the built-in wording passes', () => {
    expect(checkPlaceholders(invite, builtIn)).toEqual({ unknown: [], missing: [] })
  })
})

describe('saveBlocker', () => {
  test('nothing to save until something changes', () => {
    expect(saveBlocker(invite, builtIn, false)).toBe('Nothing has changed.')
  })
  test('placeholder problems point at their notes', () => {
    expect(saveBlocker(invite, { ...builtIn, body: '<p>Hi {nmae}</p><p>{chores_link}</p>' }, true)).toBe('Fix the placeholders noted above first.')
    expect(saveBlocker(invite, { ...builtIn, body: '<p>Hi</p>' }, true)).toBe('Fix the placeholders noted above first.')
  })
  test('an email needs a subject; a form text doesn’t', () => {
    expect(saveBlocker(invite, { ...builtIn, subject: '  ' }, true)).toBe('The email needs a subject.')
    expect(saveBlocker(config.kinds['forms.info'], { subject: '', body: '<p>New.</p>' }, true)).toBeNull()
  })
  test('a changed letter with its placeholders may be saved', () => {
    expect(saveBlocker(invite, { ...builtIn, subject: 'Chores, {name}' }, true)).toBeNull()
  })
})

describe('statusText', () => {
  test('unsaved, built-in, or saved by whom and when', () => {
    expect(statusText({ dirty: true, custom: true, updatedBy: 'Ann', updatedAt: 0 })).toBe('Unsaved changes.')
    expect(statusText({ dirty: false, custom: false, updatedBy: null, updatedAt: null })).toBe('The built-in wording.')
    expect(statusText({ dirty: false, custom: true, updatedBy: 'Ann', updatedAt: Date.UTC(2026, 10, 14, 15) })).toBe('Saved by Ann, Nov 14, 2026.')
    expect(statusText({ dirty: false, custom: true, updatedBy: null, updatedAt: null })).toBe('Saved.')
  })
})

describe('defaultPreview', () => {
  test('fills the samples, marks empty fill-ins, keeps their paragraph, and frames the email', () => {
    const p = defaultPreview(invite, builtIn)
    expect(p.subject).toBe('Pick your chores, Sam')
    expect(p.html).toContain('<span data-fill="name">Sam</span>')
    expect(p.html).toContain('{note}')
    expect(p.html).toContain('max-width:600px')
    expect(p.caption).toBe('Preview with sample values')
  })
  test('a form text has no subject and no email frame', () => {
    const p = defaultPreview(config.kinds['forms.info'], { subject: '', body: '<p>About this.</p>' })
    expect(p.subject).toBe('')
    expect(p.html).toBe('<p>About this.</p>')
  })
})
