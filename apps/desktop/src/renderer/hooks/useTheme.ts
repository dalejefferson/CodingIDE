import { useState, useEffect, useCallback } from 'react'
import { PALETTE_IDS, FONT_STACKS } from '@shared/themes'
import type { PaletteId, FontId } from '@shared/themes'

const PALETTE_KEY = 'codingide-palette'
const FONT_KEY = 'codingide-font'
const DEFAULT_PALETTE: PaletteId = 'ink-citrus'
const DEFAULT_FONT: FontId = 'system'

/**
 * Theme hook — manages palette + font selection.
 *
 * Persistence: localStorage (renderer-only, no IPC needed).
 * CSS mechanism: `data-theme` attribute on `<html>` for palette,
 *                `--font-sans` CSS variable override for font.
 *
 * T-key behavior:
 *   Press T to cycle through all 9 palettes in order.
 *   (Per-project override from the previous light/dark system is
 *   superseded by this palette system.)
 */
export function useTheme() {
  const [palette, setPalette] = useState<PaletteId>(() => {
    const stored = localStorage.getItem(PALETTE_KEY)
    if (stored && (PALETTE_IDS as readonly string[]).includes(stored)) {
      return stored as PaletteId
    }
    return DEFAULT_PALETTE
  })

  const [font, setFont] = useState<FontId>(() => {
    const stored = localStorage.getItem(FONT_KEY)
    if (stored && stored in FONT_STACKS) {
      return stored as FontId
    }
    return DEFAULT_FONT
  })

  // Apply palette via data-theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', palette)
    localStorage.setItem(PALETTE_KEY, palette)
  }, [palette])

  // Apply font via CSS variable override on <html>
  useEffect(() => {
    document.documentElement.style.setProperty('--font-sans', FONT_STACKS[font])
    localStorage.setItem(FONT_KEY, font)
  }, [font])

  /**
   * Cycle to the next palette. Called by the T-key handler.
   * Order: slate-pop → teal-ocean → ink-citrus → ... → midnight-lavender → slate-pop
   */
  const cyclePalette = useCallback(() => {
    setPalette((current) => {
      const idx = PALETTE_IDS.indexOf(current)
      return PALETTE_IDS[(idx + 1) % PALETTE_IDS.length]
    })
  }, [])

  return { palette, setPalette, font, setFont, cyclePalette }
}
