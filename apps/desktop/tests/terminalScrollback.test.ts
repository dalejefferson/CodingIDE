import { describe, it, expect } from 'vitest'
import { capScrollback, MAX_SCROLLBACK_LINES } from '../src/services/terminalService'

describe('capScrollback (character-based)', () => {
  it('does not modify buffer under the cap', () => {
    const buffer = ['hello', 'world']
    const result = capScrollback(buffer, 100)
    expect(result).toHaveLength(2)
    expect(result).toEqual(['hello', 'world'])
  })

  it('does not modify buffer at exactly the cap', () => {
    const buffer = ['aaaaa', 'bbbbb'] // 10 chars total
    const result = capScrollback(buffer, 10)
    expect(result).toHaveLength(2)
  })

  it('trims oldest chunks when over the cap', () => {
    const buffer = ['aaaa', 'bbbb', 'cccc'] // 12 chars total
    const result = capScrollback(buffer, 8)
    // Should drop 'aaaa' (oldest), keeping 'bbbb' + 'cccc' = 8 chars
    expect(result).toEqual(['bbbb', 'cccc'])
  })

  it('drops multiple old chunks to fit under cap', () => {
    const buffer = ['aaa', 'bbb', 'ccc', 'ddd'] // 12 chars
    const result = capScrollback(buffer, 6)
    expect(result).toEqual(['ccc', 'ddd'])
  })

  it('always keeps at least one chunk', () => {
    const buffer = ['a-very-long-chunk']
    const result = capScrollback(buffer, 1)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('a-very-long-chunk')
  })

  it('handles empty buffer', () => {
    const result = capScrollback([], 100)
    expect(result).toHaveLength(0)
  })

  it('modifies the buffer in place', () => {
    const buffer = ['aaaa', 'bbbb', 'cccc']
    const result = capScrollback(buffer, 8)
    expect(result).toBe(buffer) // same reference
    expect(buffer).toEqual(['bbbb', 'cccc'])
  })

  it('exports MAX_SCROLLBACK_LINES constant', () => {
    expect(MAX_SCROLLBACK_LINES).toBe(5000)
    expect(typeof MAX_SCROLLBACK_LINES).toBe('number')
  })
})
