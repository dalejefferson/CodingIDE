import { describe, it, expect } from 'vitest'
import { buildCssSelector, trimInnerText, formatPickerPayload } from '../src/shared/elementPicker'
import type { ElementPickerPayload } from '../src/shared/types'

// ── buildCssSelector ──────────────────────────────────────────

describe('buildCssSelector', () => {
  it('returns tag alone when no id or classes', () => {
    expect(buildCssSelector('div', null, [])).toBe('div')
  })

  it('lowercases the tag', () => {
    expect(buildCssSelector('DIV', null, [])).toBe('div')
  })

  it('appends #id when present', () => {
    expect(buildCssSelector('section', 'main', [])).toBe('section#main')
  })

  it('appends classes', () => {
    expect(buildCssSelector('div', null, ['container', 'wide'])).toBe('div.container.wide')
  })

  it('combines tag, id, and classes', () => {
    expect(buildCssSelector('div', 'app', ['root', 'dark'])).toBe('div#app.root.dark')
  })

  it('skips empty class strings', () => {
    expect(buildCssSelector('span', null, ['', 'bold', ''])).toBe('span.bold')
  })
})

// ── trimInnerText ─────────────────────────────────────────────

describe('trimInnerText', () => {
  it('returns short text unchanged', () => {
    expect(trimInnerText('Hello world')).toBe('Hello world')
  })

  it('collapses whitespace', () => {
    expect(trimInnerText('Hello   world')).toBe('Hello world')
  })

  it('collapses newlines and tabs', () => {
    expect(trimInnerText('Hello\n\t  world')).toBe('Hello world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(trimInnerText('  Hello  ')).toBe('Hello')
  })

  it('truncates with ellipsis at custom max length', () => {
    expect(trimInnerText('Hello world', 5)).toBe('Hello…')
  })

  it('does not truncate at exact boundary', () => {
    expect(trimInnerText('Hello', 5)).toBe('Hello')
  })

  it('handles empty string', () => {
    expect(trimInnerText('')).toBe('')
  })

  it('handles whitespace-only string', () => {
    expect(trimInnerText('   \n\t  ')).toBe('')
  })

  it('truncates at default 200 chars', () => {
    const long = 'a'.repeat(250)
    const result = trimInnerText(long)
    expect(result.length).toBe(201) // 200 + ellipsis
    expect(result.endsWith('…')).toBe(true)
  })
})

// ── formatPickerPayload ───────────────────────────────────────

describe('formatPickerPayload', () => {
  const basePayload: ElementPickerPayload = {
    selector: 'button#submit.btn.primary',
    innerText: 'Submit Form',
    tag: 'button',
    id: 'submit',
    classes: ['btn', 'primary'],
    attributes: { type: 'submit', 'aria-label': 'Submit the form' },
  }

  it('formats a full payload', () => {
    const result = formatPickerPayload(basePayload)
    expect(result).toContain('[Element] button#submit.btn.primary')
    expect(result).toContain('Tag: button')
    expect(result).toContain('ID: submit')
    expect(result).toContain('Classes: btn, primary')
    expect(result).toContain('Attributes: type="submit" aria-label="Submit the form"')
    expect(result).toContain('Text: "Submit Form"')
  })

  it('omits ID line when id is null', () => {
    const payload: ElementPickerPayload = {
      ...basePayload,
      id: null,
      selector: 'div.card',
    }
    const result = formatPickerPayload(payload)
    expect(result).not.toContain('ID:')
  })

  it('omits Classes when empty', () => {
    const payload: ElementPickerPayload = {
      ...basePayload,
      classes: [],
      selector: 'div#main',
    }
    const result = formatPickerPayload(payload)
    expect(result).not.toContain('Classes:')
  })

  it('omits Attributes when empty', () => {
    const payload: ElementPickerPayload = {
      ...basePayload,
      attributes: {},
    }
    const result = formatPickerPayload(payload)
    expect(result).not.toContain('Attributes:')
  })

  it('omits Text when innerText is empty', () => {
    const payload: ElementPickerPayload = {
      ...basePayload,
      innerText: '',
    }
    const result = formatPickerPayload(payload)
    expect(result).not.toContain('Text:')
  })

  it('always includes the Element selector line', () => {
    const minimal: ElementPickerPayload = {
      selector: 'div',
      innerText: '',
      tag: 'div',
      id: null,
      classes: [],
      attributes: {},
    }
    const result = formatPickerPayload(minimal)
    expect(result).toBe('[Element] div\nTag: div')
  })
})
