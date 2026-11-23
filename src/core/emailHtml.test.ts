import { describe, expect, test } from 'vitest'
import { capImageWidths, emailDocument, emailHtmlWarnings, emailShell, htmlToText, inlineStyles, unwrapListParagraphs } from './emailHtml.js'

describe('inlineStyles', () => {
  test('styles each known tag, keeping its own style after the default', () => {
    expect(inlineStyles('<p>a</p>')).toBe('<p style="margin:0 0 16px">a</p>')
    expect(inlineStyles('<p style="text-align: center;">a</p>')).toBe('<p style="margin:0 0 16px;text-align: center">a</p>')
    expect(inlineStyles('<a href="x">a</a>')).toBe('<a href="x" style="text-decoration:underline">a</a>')
    expect(inlineStyles('<img src="a.png" />')).toMatch(/^<img src="a.png" style="display:block;[^"]*" \/>$/)
    expect(inlineStyles('<pre>x</pre><span>y</span>')).toBe('<pre>x</pre><span>y</span>')
  })

  test('doesn’t mistake longer tag names for known ones', () => {
    expect(inlineStyles('<abbr>x</abbr><header>y</header>')).toBe('<abbr>x</abbr><header>y</header>')
  })
})

test('unwrapListParagraphs takes the editor’s paragraph out of a list item, and leaves anything more alone', () => {
  expect(unwrapListParagraphs('<ul><li><p>One</p></li><li class="x"><p>Two <b>2</b></p></li></ul>')).toBe('<ul><li>One</li><li class="x">Two <b>2</b></li></ul>')
  expect(unwrapListParagraphs('<li><p>a</p><p>b</p></li>')).toBe('<li><p>a</p><p>b</p></li>')
  expect(unwrapListParagraphs('<li><p>a</p><ul><li><p>b</p></li></ul></li>')).toBe('<li><p>a</p><ul><li>b</li></ul></li>')
})

test('capImageWidths caps images to the column and lets the height scale', () => {
  expect(capImageWidths('<img src="a" width="1200" height="800">')).toBe('<img src="a" width="600">')
  expect(capImageWidths('<img src="a" width="300" height="200">')).toBe('<img src="a" width="300" height="200">')
  expect(capImageWidths('<img src="a">')).toBe('<img src="a">')
})

test('emailShell puts the body in a left-aligned 600px column with no colours, with a table for Outlook', () => {
  const html = emailShell('<p>Hi</p><h2>Head</h2><blockquote>Q</blockquote>')
  expect(html).toMatch(/^<!--\[if mso\]><table role="presentation" width="600"/)
  expect(html).toContain('max-width:600px')
  expect(html).toContain('font-size:16px')
  expect(html).not.toContain('margin:0 auto')
  expect(html).not.toMatch(/background|[^-]color:/)
  expect(html).toContain('<p style="margin:0 0 16px">Hi</p>')
})

test('emailDocument makes a whole document with a viewport, and leaves one alone', () => {
  const doc = emailDocument('<p>Hi</p>')
  expect(doc).toMatch(/^<!doctype html>/)
  expect(doc).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">')
  expect(doc).toContain('<meta name="color-scheme" content="light dark">')
  expect(doc).toContain('<body>\n<p>Hi</p>\n</body>')
  expect(emailDocument(doc)).toBe(doc)
  expect(emailDocument('<html><body>x</body></html>')).toBe('<html><body>x</body></html>')
})

test('htmlToText keeps the structure readable', () => {
  const html = [
    '<h2>Welcome</h2>',
    '<p>Hi <strong>Sam</strong>,<br>line two</p>',
    '<ul><li><p>One</p></li><li><p>Two</p></li></ul>',
    '<p><a href="https://e.org">https://e.org</a> and <a href="https://x.org">the page</a></p>',
    '<hr>',
    '<p>&lt;3 &amp; &#8217;bye&#x2019;&nbsp;now</p>',
  ].join('')
  expect(htmlToText(html)).toBe('Welcome\n\nHi Sam,\nline two\n\n- One\n\n- Two\n\nhttps://e.org and the page (https://x.org)\n\n---\n\n<3 & ’bye’ now')
})

test('emailHtmlWarnings flags what email clients won’t show', () => {
  expect(emailHtmlWarnings('<p>fine</p><img src="https://a.org/x.png">')).toEqual([])
  expect(emailHtmlWarnings('<style>p{}</style>')).toHaveLength(1)
  expect(emailHtmlWarnings('<img src="data:image/png;base64,xx">')).toHaveLength(2)
  expect(emailHtmlWarnings('<img src="/x.png">')).toHaveLength(1)
  expect(emailHtmlWarnings('<img src="{info_page_url}">')).toEqual([])
})
