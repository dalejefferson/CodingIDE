import { describe, it, expect } from 'vitest'
import {
  PALETTE_IDS,
  PALETTES,
  PALETTE_LABELS,
  FONT_IDS,
  FONT_STACKS,
  FONT_LABELS,
  luminance,
  contrastText,
} from '../src/shared/themes'

// ── Palette definitions ─────────────────────────────────────────

describe('PALETTE_IDS', () => {
  it('contains exactly 15 palettes', () => {
    expect(PALETTE_IDS).toHaveLength(15)
  })

  it('has unique entries', () => {
    const unique = new Set(PALETTE_IDS)
    expect(unique.size).toBe(PALETTE_IDS.length)
  })

  it('lists expected palette names', () => {
    expect(PALETTE_IDS).toContain('slate-pop')
    expect(PALETTE_IDS).toContain('teal-ocean')
    expect(PALETTE_IDS).toContain('ink-citrus')
    expect(PALETTE_IDS).toContain('deep-denim')
    expect(PALETTE_IDS).toContain('sage-moss')
    expect(PALETTE_IDS).toContain('plum-gold')
    expect(PALETTE_IDS).toContain('cream-amber')
    expect(PALETTE_IDS).toContain('pastel-garden')
    expect(PALETTE_IDS).toContain('midnight-lavender')
    expect(PALETTE_IDS).toContain('meadow-sage')
    expect(PALETTE_IDS).toContain('ember-clay')
    expect(PALETTE_IDS).toContain('blush-petal')
    expect(PALETTE_IDS).toContain('terra-olive')
    expect(PALETTE_IDS).toContain('linen-sky')
    expect(PALETTE_IDS).toContain('copper-tide')
  })
})

describe('PALETTES', () => {
  it('has a token set for every palette id', () => {
    for (const id of PALETTE_IDS) {
      expect(PALETTES[id]).toBeDefined()
    }
  })

  it('each palette has all required token fields', () => {
    const requiredKeys = [
      'bg',
      'surface',
      'surface2',
      'border',
      'text',
      'muted',
      'primary',
      'onPrimary',
      'accent',
      'success',
      'warning',
      'danger',
      'focusRing',
      'swatch',
    ]
    for (const id of PALETTE_IDS) {
      const tokens = PALETTES[id]
      for (const key of requiredKeys) {
        expect(tokens).toHaveProperty(key)
      }
    }
  })

  it('each swatch has exactly 4 colors', () => {
    for (const id of PALETTE_IDS) {
      expect(PALETTES[id].swatch).toHaveLength(4)
    }
  })

  it('swatch colors are valid hex strings', () => {
    for (const id of PALETTE_IDS) {
      for (const color of PALETTES[id].swatch) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    }
  })
})

describe('PALETTE_LABELS', () => {
  it('has a label for every palette id', () => {
    for (const id of PALETTE_IDS) {
      expect(PALETTE_LABELS[id]).toBeDefined()
      expect(typeof PALETTE_LABELS[id]).toBe('string')
      expect(PALETTE_LABELS[id].length).toBeGreaterThan(0)
    }
  })
})

// ── Font definitions ─────────────────────────────────────────────

describe('FONT_IDS', () => {
  it('contains exactly 13 fonts', () => {
    expect(FONT_IDS).toHaveLength(13)
  })

  it('has unique entries', () => {
    const unique = new Set(FONT_IDS)
    expect(unique.size).toBe(FONT_IDS.length)
  })
})

describe('FONT_STACKS', () => {
  it('has a stack for every font id', () => {
    for (const id of FONT_IDS) {
      expect(FONT_STACKS[id]).toBeDefined()
      expect(typeof FONT_STACKS[id]).toBe('string')
      expect(FONT_STACKS[id].length).toBeGreaterThan(0)
    }
  })
})

describe('FONT_LABELS', () => {
  it('has a label for every font id', () => {
    for (const id of FONT_IDS) {
      expect(FONT_LABELS[id]).toBeDefined()
      expect(typeof FONT_LABELS[id]).toBe('string')
      expect(FONT_LABELS[id].length).toBeGreaterThan(0)
    }
  })
})

// ── Brightness helpers ───────────────────────────────────────────

describe('luminance', () => {
  it('returns 0 for black', () => {
    expect(luminance('#000000')).toBe(0)
  })

  it('returns 255 for white', () => {
    expect(luminance('#FFFFFF')).toBe(255)
  })

  it('returns higher value for lighter colors', () => {
    expect(luminance('#FFFFFF')).toBeGreaterThan(luminance('#808080'))
    expect(luminance('#808080')).toBeGreaterThan(luminance('#000000'))
  })

  it('handles palette source colors', () => {
    // Dark background (plum-gold: #210F37) should be low
    expect(luminance('#210F37')).toBeLessThan(140)
    // Light background (pastel-garden: #F0FFDF) should be high
    expect(luminance('#F0FFDF')).toBeGreaterThan(140)
  })
})

describe('contrastText', () => {
  it('returns dark text for light backgrounds', () => {
    expect(contrastText('#FFFFFF')).toBe('#1d1d1f')
    expect(contrastText('#F0FFDF')).toBe('#1d1d1f')
    expect(contrastText('#EAEFEF')).toBe('#1d1d1f')
  })

  it('returns light text for dark backgrounds', () => {
    expect(contrastText('#000000')).toBe('#f5f5f7')
    expect(contrastText('#210F37')).toBe('#f5f5f7')
    expect(contrastText('#17153B')).toBe('#f5f5f7')
  })
})
