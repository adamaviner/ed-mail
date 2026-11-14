import { describe, expect, test } from 'vitest'
import { escapeHtml, isEmail } from './index.js'

describe('core', () => {
  test('isEmail accepts plain addresses and trims', () => {
    expect(isEmail(' someone@example.org ')).toBe(true)
    expect(isEmail('someone@example')).toBe(false)
    expect(isEmail('some one@example.org')).toBe(false)
  })

  test('escapeHtml escapes markup and quotes', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;')
  })
})
