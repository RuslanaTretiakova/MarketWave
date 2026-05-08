// Allow-list HTML sanitizer for copywriter content. The TipTap editor only
// emits the tags below, but we sanitize on the server as defense-in-depth so
// pasted HTML or a tampered client cannot smuggle through scripts/iframes.

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'code',
  'pre',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'rel', 'target']),
}

const VOID_TAGS = new Set(['br'])

function isSafeHref(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return false
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return true
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:'
  } catch {
    return false
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const TAG_REGEX = /<(\/)?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g
const ATTR_REGEX =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"|([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*'([^']*)'/g

/**
 * Strip every tag/attribute that is not on the allow-list, escape stray text,
 * and force `rel="noopener noreferrer"` on every external `<a>` so submitted
 * content is safe to render with `dangerouslySetInnerHTML` / read-only TipTap.
 */
export function sanitizeContentHtml(input: string): string {
  if (!input) return ''
  // First strip any block-level disallowed elements wholesale (script / style / iframe / etc.)
  const stripped = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(script|style|iframe|object|embed|link|meta|svg|math)\b[^>]*>/gi, '')

  let result = ''
  let lastIndex = 0
  const stack: string[] = []
  let match: RegExpExecArray | null
  TAG_REGEX.lastIndex = 0

  while ((match = TAG_REGEX.exec(stripped)) !== null) {
    const [full, closing, rawTag, rawAttrs] = match
    const start = match.index
    if (start > lastIndex) {
      result += escapeHtml(stripped.slice(lastIndex, start))
    }
    lastIndex = start + full.length

    const tag = rawTag.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) {
      // Drop the tag — keep child text where applicable (already part of the normal flow).
      continue
    }

    if (closing) {
      // Pop the stack up to the matching tag (or drop if we never opened it).
      const idx = stack.lastIndexOf(tag)
      if (idx === -1) continue
      while (stack.length - 1 > idx) {
        const orphan = stack.pop()
        if (orphan) result += `</${orphan}>`
      }
      stack.pop()
      result += `</${tag}>`
      continue
    }

    let attrs = ''
    if (rawAttrs && ALLOWED_ATTRS[tag]) {
      const allowedForTag = ALLOWED_ATTRS[tag]
      ATTR_REGEX.lastIndex = 0
      let attrMatch: RegExpExecArray | null
      while ((attrMatch = ATTR_REGEX.exec(rawAttrs)) !== null) {
        const name = (attrMatch[1] ?? attrMatch[3] ?? '').toLowerCase()
        const value = attrMatch[2] ?? attrMatch[4] ?? ''
        if (!allowedForTag.has(name)) continue
        if (name === 'href' && !isSafeHref(value)) continue
        if (name === 'target' && value !== '_blank') continue
        attrs += ` ${name}="${escapeHtml(value)}"`
      }
      if (tag === 'a') {
        // Always force noopener for safety.
        if (!/\srel=/.test(attrs)) attrs += ' rel="noopener noreferrer"'
        if (!/\starget=/.test(attrs) && /\shref=/.test(attrs)) attrs += ' target="_blank"'
      }
    }

    if (VOID_TAGS.has(tag)) {
      result += `<${tag}${attrs} />`
      continue
    }

    stack.push(tag)
    result += `<${tag}${attrs}>`
  }

  if (lastIndex < stripped.length) {
    result += escapeHtml(stripped.slice(lastIndex))
  }

  while (stack.length > 0) {
    const orphan = stack.pop()
    if (orphan) result += `</${orphan}>`
  }

  return result
}

/** Strip tags and decode common entities to compute a rough word count. */
export function countWords(html: string): number {
  if (!html) return 0
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
  if (!text) return 0
  return text.split(/\s+/).length
}

/**
 * True if the body has any non-whitespace text content. Used to reject
 * empty submissions ("Submit for review" should require actual content).
 */
export function bodyHasContent(html: string): boolean {
  if (!html) return false
  const text = html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text.length > 0
}
