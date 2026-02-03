import { describe, it, expect } from 'vitest'
import { capScrollback, MAX_SCROLLBACK_LINES } from '../src/services/terminalService'

describe('capScrollback', () => {
  it('does not modify buffer under the cap', () => {
    const buffer = ['line1', 'line2', 'line3']
    const result = capScrollback(buffer, 100)
    expect(result).toHaveLength(3)
    expect(result).toEqual(['line1', 'line2', 'line3'])
  })

  it('does not modify buffer at exactly the cap', () => {
    const buffer = Array.from({ length: 100 }, (_, i) => `line-${i}`)
    const result = capScrollback(buffer, 100)
    expect(result).toHaveLength(100)
  })

  it('trims oldest lines when over the cap', () => {
    const buffer = Array.from({ length: 150 }, (_, i) => `line-${i}`)
    const result = capScrollback(buffer, 100)
    expect(result).toHaveLength(100)
    // Should keep the last 100 lines (line-50 through line-149)
    expect(result[0]).toBe('line-50')
    expect(result[99]).toBe('line-149')
  })

  it('handles single-line overflow', () => {
    const buffer = Array.from({ length: 101 }, (_, i) => `line-${i}`)
    const result = capScrollback(buffer, 100)
    expect(result).toHaveLength(100)
    expect(result[0]).toBe('line-1')
  })

  it('handles empty buffer', () => {
    const result = capScrollback([], 100)
    expect(result).toHaveLength(0)
  })

  it('handles cap of 1', () => {
    const buffer = ['a', 'b', 'c']
    const result = capScrollback(buffer, 1)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('c')
  })

  it('modifies the buffer in place', () => {
    const buffer = ['a', 'b', 'c', 'd', 'e']
    const result = capScrollback(buffer, 3)
    expect(result).toBe(buffer) // same reference
    expect(buffer).toHaveLength(3)
    expect(buffer).toEqual(['c', 'd', 'e'])
  })

  it('exports MAX_SCROLLBACK_LINES constant', () => {
    expect(MAX_SCROLLBACK_LINES).toBe(5000)
    expect(typeof MAX_SCROLLBACK_LINES).toBe('number')
  })
})
