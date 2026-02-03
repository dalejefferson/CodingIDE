import { describe, it, expect } from 'vitest'
import { extractOsc7Cwd } from '../src/shared/osc7Parser'

describe('extractOsc7Cwd', () => {
  it('extracts path from OSC 7 with BEL terminator', () => {
    const data = '\x1b]7;file://hostname/Users/test\x07'
    expect(extractOsc7Cwd(data)).toBe('/Users/test')
  })

  it('extracts path from OSC 7 with ST (ESC\\) terminator', () => {
    const data = '\x1b]7;file://hostname/Users/test\x1b\\'
    expect(extractOsc7Cwd(data)).toBe('/Users/test')
  })

  it('returns last match when multiple sequences in one chunk', () => {
    const data = '\x1b]7;file://host/Users/first\x07some output\x1b]7;file://host/Users/second\x07'
    expect(extractOsc7Cwd(data)).toBe('/Users/second')
  })

  it('decodes URL-encoded paths', () => {
    const data = '\x1b]7;file://host/Users/my%20folder\x07'
    expect(extractOsc7Cwd(data)).toBe('/Users/my folder')
  })

  it('returns null for regular terminal output', () => {
    expect(extractOsc7Cwd('regular terminal output')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractOsc7Cwd('')).toBeNull()
  })

  it('handles empty hostname', () => {
    const data = '\x1b]7;file:///tmp/foo\x07'
    expect(extractOsc7Cwd(data)).toBe('/tmp/foo')
  })
})
