/**
 * Element Picker — pure formatting utilities.
 *
 * These functions produce a human-readable summary from an element
 * picker payload. All functions are pure (no DOM, no side-effects)
 * and easy to test.
 */

import type { ElementPickerPayload } from './types'

/** Max length for trimmed innerText */
const MAX_INNER_TEXT = 200

/**
 * Build a CSS selector string from tag, id, and class list.
 *
 * - Always starts with the tag name.
 * - Appends `#id` if present.
 * - Appends `.class` for each class.
 *
 * Example: `div#main.container.wide`
 */
export function buildCssSelector(tag: string, id: string | null, classes: string[]): string {
  let selector = tag.toLowerCase()
  if (id) {
    selector += `#${id}`
  }
  for (const cls of classes) {
    if (cls.length > 0) {
      selector += `.${cls}`
    }
  }
  return selector
}

/**
 * Trim and collapse whitespace in innerText, truncating to `maxLen`.
 *
 * - Collapses consecutive whitespace (including newlines) to a single space.
 * - Strips leading/trailing whitespace.
 * - Appends "…" if truncated.
 */
export function trimInnerText(text: string, maxLen: number = MAX_INNER_TEXT): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= maxLen) return collapsed
  return collapsed.slice(0, maxLen) + '…'
}

/**
 * Format a full picker payload into a readable multi-line summary
 * suitable for injection into the chat composer.
 *
 * Format:
 * ```
 * [Element] <selector>
 * Tag: <tag> | ID: <id> | Classes: <classes>
 * Attributes: <key=value pairs>
 * Text: "<trimmed innerText>"
 * ```
 */
export function formatPickerPayload(payload: ElementPickerPayload): string {
  const lines: string[] = []

  lines.push(`[Element] ${payload.selector}`)

  const meta: string[] = [`Tag: ${payload.tag}`]
  if (payload.id) {
    meta.push(`ID: ${payload.id}`)
  }
  if (payload.classes.length > 0) {
    meta.push(`Classes: ${payload.classes.join(', ')}`)
  }
  lines.push(meta.join(' | '))

  const attrEntries = Object.entries(payload.attributes)
  if (attrEntries.length > 0) {
    const attrStr = attrEntries.map(([k, v]) => `${k}="${v}"`).join(' ')
    lines.push(`Attributes: ${attrStr}`)
  }

  if (payload.innerText.length > 0) {
    lines.push(`Text: "${payload.innerText}"`)
  }

  return lines.join('\n')
}
