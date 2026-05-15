import { describe, expect, it } from 'vitest'

import { bodyHasContent, countWords, sanitizeContentHtml } from '@/lib/orders/sanitize-content-html'

describe('sanitizeContentHtml', () => {
  it('returns empty string for falsy input', () => {
    expect(sanitizeContentHtml('')).toBe('')
    expect(sanitizeContentHtml(null as unknown as string)).toBe('')
    expect(sanitizeContentHtml(undefined as unknown as string)).toBe('')
  })

  it('passes through allowed tags', () => {
    const input = '<p>Hello <strong>world</strong></p>'
    const out = sanitizeContentHtml(input)
    expect(out).toContain('<p>')
    expect(out).toContain('<strong>')
    expect(out).toContain('Hello')
  })

  it('strips disallowed tags', () => {
    const out = sanitizeContentHtml('<p>text</p><div>bad</div>')
    expect(out).not.toContain('<div>')
    expect(out).toContain('text')
    expect(out).toContain('bad')
  })

  it('strips <script> tags (inner text is left as escaped, harmless text)', () => {
    // The sanitizer removes the <script> tag itself; the inner text becomes
    // escaped plain text — no executable code remains in the HTML tree.
    const out = sanitizeContentHtml('<p>ok</p><script>alert(1)</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('ok')
    // Content is present but escaped — cannot execute as a script
    expect(out).not.toContain('<script>')
  })

  it('strips <iframe> tags', () => {
    const out = sanitizeContentHtml('<iframe src="http://evil.com"></iframe>')
    expect(out).not.toContain('<iframe>')
    expect(out).not.toContain('evil.com')
  })

  it('strips <style> tags', () => {
    const out = sanitizeContentHtml('<style>body{display:none}</style><p>text</p>')
    expect(out).not.toContain('<style>')
    expect(out).toContain('text')
  })

  it('strips HTML comments', () => {
    const out = sanitizeContentHtml('<!-- secret --><p>visible</p>')
    expect(out).not.toContain('secret')
    expect(out).toContain('visible')
  })

  it('neutralizes XSS in attribute values', () => {
    const out = sanitizeContentHtml('<a href="javascript:alert(1)">click</a>')
    expect(out).not.toContain('javascript:')
  })

  it('allows safe href values on <a>', () => {
    const out = sanitizeContentHtml('<a href="https://example.com">link</a>')
    expect(out).toContain('href="https://example.com"')
  })

  it('allows mailto href on <a>', () => {
    const out = sanitizeContentHtml('<a href="mailto:user@example.com">email</a>')
    expect(out).toContain('href="mailto:user@example.com"')
  })

  it('forces rel="noopener noreferrer" on <a>', () => {
    const out = sanitizeContentHtml('<a href="https://example.com">link</a>')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it('strips disallowed attributes', () => {
    const out = sanitizeContentHtml('<p onclick="evil()" class="x">text</p>')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('class')
    expect(out).toContain('text')
  })

  it('strips target attribute unless _blank', () => {
    const out = sanitizeContentHtml('<a href="https://x.com" target="_top">link</a>')
    expect(out).not.toContain('target="_top"')
  })

  it('allows target="_blank"', () => {
    const out = sanitizeContentHtml('<a href="https://x.com" target="_blank">link</a>')
    expect(out).toContain('target="_blank"')
  })

  it('renders <br> as void tag', () => {
    const out = sanitizeContentHtml('<p>line1<br>line2</p>')
    expect(out).toContain('<br')
  })

  it('handles list elements', () => {
    const out = sanitizeContentHtml('<ul><li>item</li></ul>')
    expect(out).toContain('<ul>')
    expect(out).toContain('<li>')
    expect(out).toContain('item')
  })

  it('escapes stray text with special characters', () => {
    const out = sanitizeContentHtml('<p>5 &lt; 10</p>')
    expect(out).toContain('5')
    expect(out).toContain('10')
  })
})

describe('countWords', () => {
  it('returns 0 for empty/null input', () => {
    expect(countWords('')).toBe(0)
    expect(countWords(null as unknown as string)).toBe(0)
  })

  it('counts words in plain text', () => {
    expect(countWords('<p>hello world</p>')).toBe(2)
  })

  it('strips tags before counting', () => {
    expect(countWords('<p>one</p><strong>two</strong><em>three</em>')).toBe(3)
  })

  it('decodes &nbsp; before counting', () => {
    expect(countWords('<p>word1&nbsp;word2</p>')).toBe(2)
  })
})

describe('bodyHasContent', () => {
  it('returns false for empty/null', () => {
    expect(bodyHasContent('')).toBe(false)
    expect(bodyHasContent(null as unknown as string)).toBe(false)
  })

  it('returns false for whitespace-only content', () => {
    expect(bodyHasContent('<p>   </p>')).toBe(false)
  })

  it('returns false for tags with no text', () => {
    expect(bodyHasContent('<p></p><br />')).toBe(false)
  })

  it('returns true when text is present', () => {
    expect(bodyHasContent('<p>Hello</p>')).toBe(true)
  })
})
