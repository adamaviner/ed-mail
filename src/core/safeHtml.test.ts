import { describe, expect, it } from 'vitest'
import { safeHtml } from './safeHtml.js'

describe('safeHtml', () => {
  it('keeps what the editor makes', () => {
    const html =
      '<h2>Wex</h2><p style="text-align: center">Hi &amp; <strong>welcome</strong>, <a target="_blank" rel="noopener noreferrer nofollow" href="https://earthdance.net">here</a></p><ul><li>One</li></ul><img src="https://earthdance.net/a.jpg" alt="A" width="300"><p>{event_title}</p>'
    expect(safeHtml(html)).toBe(html)
  })
  it('keeps links to a placeholder, which letters fill in when sent', () => {
    expect(safeHtml('<a href="{registration_link}">{registration_link}</a>')).toBe('<a href="{registration_link}">{registration_link}</a>')
    expect(safeHtml('<a href="{x}y">x</a>')).toBe('<a>x</a>')
  })
  it('shows scripts, comments and other tags as text, and drops unsafe attributes', () => {
    expect(safeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(safeHtml('<p onclick="x()" class="c">Hi</p>')).toBe('<p>Hi</p>')
    expect(safeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
    expect(safeHtml('<img src=x onerror=alert(1)>')).toBe('<img>')
    expect(safeHtml('<p style="background:url(x)">a</p>')).toBe('<p>a</p>')
    expect(safeHtml('<iframe src="https://x"></iframe><!-- c -->')).toBe('&lt;iframe src="https://x"&gt;&lt;/iframe&gt;&lt;!-- c --&gt;')
  })
  it('escapes a stray < and quotes in values', () => {
    expect(safeHtml('1 < 2 <p')).toBe('1 &lt; 2 &lt;p')
    expect(safeHtml(`<a href='https://x/?a="b"'>x</a>`)).toBe('<a href="https://x/?a=&quot;b&quot;">x</a>')
  })
})
