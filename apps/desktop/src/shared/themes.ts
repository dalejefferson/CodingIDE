/**
 * Theme / Palette Definitions — 15 color palettes + 13 font options.
 *
 * Each palette defines 4 source colors which are used to derive a full
 * CSS variable token set. The tokens are applied via `data-theme` attribute
 * on `<html>`.
 *
 * Persistence: localStorage in the renderer (no IPC needed).
 */

// ── Palette IDs ──────────────────────────────────────────────

export const PALETTE_IDS = [
  'slate-pop',
  'teal-ocean',
  'ink-citrus',
  'deep-denim',
  'sage-moss',
  'plum-gold',
  'cream-amber',
  'pastel-garden',
  'midnight-lavender',
  'meadow-sage',
  'ember-clay',
  'blush-petal',
  'terra-olive',
  'linen-sky',
  'copper-tide',
] as const

export type PaletteId = (typeof PALETTE_IDS)[number]

// ── Token set generated per palette ──────────────────────────

export interface PaletteTokens {
  bg: string
  surface: string
  surface2: string
  border: string
  text: string
  muted: string
  primary: string
  onPrimary: string
  accent: string
  success: string
  warning: string
  danger: string
  focusRing: string
  /** The 4 source colors for swatch display */
  swatch: [string, string, string, string]
}

// ── Brightness helper ────────────────────────────────────────

/** Parse a hex color (#RRGGBB) to [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/**
 * Relative luminance (simplified sRGB).
 * Returns 0–255 range value. Threshold of 140 gives good contrast.
 */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** Return white or dark text color based on background brightness */
export function contrastText(bgHex: string): string {
  return luminance(bgHex) > 140 ? '#1d1d1f' : '#f5f5f7'
}

/** Return a semi-transparent version of a hex color */
function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// ── Palette Definitions ──────────────────────────────────────

/**
 * Each palette is built from 4 source colors:
 *   [0] = background / lightest
 *   [1] = surface / secondary
 *   [2] = primary / dark accent
 *   [3] = accent / highlight
 */
export const PALETTES: Record<PaletteId, PaletteTokens> = {
  'slate-pop': buildPalette('#576A8F', '#B7BDF7', '#FFF8DE', '#FF7444'),
  'teal-ocean': buildPalette('#EBF4F6', '#7AB2B2', '#088395', '#09637E'),
  'ink-citrus': buildPalette('#EAEFEF', '#BFC9D1', '#25343F', '#FF9B51'),
  'deep-denim': buildPalette('#D2C1B6', '#456882', '#234C6A', '#1B3C53'),
  'sage-moss': buildPalette('#E8E2D8', '#BFC6C4', '#6F8F72', '#F2A65A'),
  'plum-gold': buildPalette('#210F37', '#4F1C51', '#A55B4B', '#DCA06D'),
  'cream-amber': buildPalette('#F5F7F8', '#F4CE14', '#495E57', '#45474B'),
  'pastel-garden': buildPalette('#F0FFDF', '#A8DF8E', '#FFD8DF', '#FFAAB8'),
  'midnight-lavender': buildPalette('#17153B', '#2E236C', '#433D8B', '#C8ACD6'),
  'meadow-sage': buildPalette('#F1F3E0', '#D2DCB6', '#A1BC98', '#778873'),
  'ember-clay': buildPalette('#FFEAD3', '#EA7B7B', '#D25353', '#9E3B3B'),
  'blush-petal': buildPalette('#FCF8F8', '#FBEFEF', '#F9DFDF', '#F5AFAF'),
  'terra-olive': buildPalette('#FCFAEE', '#ECDFCC', '#A5B68D', '#DA8359'),
  'linen-sky': buildPalette('#F5EFE6', '#E8DFCA', '#6D94C5', '#CBDCEB'),
  'copper-tide': buildPalette('#F4E9D7', '#B8C4A9', '#6FA4AF', '#D97D55'),
}

function buildPalette(c1: string, c2: string, c3: string, c4: string): PaletteTokens {
  const isDark = luminance(c1) < 140
  // For dark palettes: c1=bg, c2=surface, c3=accent, c4=highlight
  // For light palettes: c1=bg, c2=surface, c3=primary dark, c4=accent
  const bg = c1
  const surface = c2
  const text = contrastText(bg)
  const muted = isDark ? alpha(text, 0.5) : alpha(text, 0.55)
  const primary = isDark ? c4 : c3
  const accent = c4
  const onPrimary = contrastText(primary)
  const borderColor = isDark ? alpha('#ffffff', 0.12) : alpha('#000000', 0.1)

  // Surface2: a midpoint or slight variant
  const surface2 = isDark ? alpha('#ffffff', 0.06) : alpha('#000000', 0.04)

  return {
    bg,
    surface,
    surface2,
    border: borderColor,
    text,
    muted,
    primary,
    onPrimary,
    accent,
    success: '#34c759',
    warning: '#ff9f0a',
    danger: '#ff3b30',
    focusRing: alpha(accent, 0.4),
    swatch: [c1, c2, c3, c4],
  }
}

// ── Palette display names ────────────────────────────────────

export const PALETTE_LABELS: Record<PaletteId, string> = {
  'slate-pop': 'Slate Pop',
  'teal-ocean': 'Teal Ocean',
  'ink-citrus': 'Ink Citrus',
  'deep-denim': 'Deep Denim',
  'sage-moss': 'Sage Moss',
  'plum-gold': 'Plum Gold',
  'cream-amber': 'Cream Amber',
  'pastel-garden': 'Pastel Garden',
  'midnight-lavender': 'Midnight Lavender',
  'meadow-sage': 'Meadow Sage',
  'ember-clay': 'Ember Clay',
  'blush-petal': 'Blush Petal',
  'terra-olive': 'Terra Olive',
  'linen-sky': 'Linen Sky',
  'copper-tide': 'Copper Tide',
}

// ── Font Options ─────────────────────────────────────────────

export const FONT_IDS = [
  'system',
  'inter',
  'jetbrains-mono',
  'ibm-plex-sans',
  'source-sans',
  'space-grotesk',
  'syne',
  'crimson-pro',
  'rubik',
  'bricolage-grotesque',
  'press-start-2p',
  'caveat',
  'orbitron',
] as const

export type FontId = (typeof FONT_IDS)[number]

export const FONT_STACKS: Record<FontId, string> = {
  system:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  inter: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  'jetbrains-mono': "'JetBrains Mono', 'SF Mono', 'Menlo', monospace",
  'ibm-plex-sans': "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  'source-sans': "'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif",
  'space-grotesk': "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  syne: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
  'crimson-pro': "'Crimson Pro', 'Georgia', 'Times New Roman', serif",
  rubik: "'Rubik', -apple-system, BlinkMacSystemFont, sans-serif",
  'bricolage-grotesque': "'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, sans-serif",
  'press-start-2p': "'Press Start 2P', 'Courier New', monospace",
  caveat: "'Caveat', 'Marker Felt', cursive",
  orbitron: "'Orbitron', 'Eurostile', sans-serif",
}

export const FONT_LABELS: Record<FontId, string> = {
  system: 'System Default',
  inter: 'Inter',
  'jetbrains-mono': 'JetBrains Mono',
  'ibm-plex-sans': 'IBM Plex Sans',
  'source-sans': 'Source Sans 3',
  'space-grotesk': 'Space Grotesk',
  syne: 'Syne',
  'crimson-pro': 'Crimson Pro',
  rubik: 'Rubik',
  'bricolage-grotesque': 'Bricolage Grotesque',
  'press-start-2p': 'Press Start 2P',
  caveat: 'Caveat',
  orbitron: 'Orbitron',
}

// ── Gradient Options ──────────────────────────────────────────

export const GRADIENT_IDS = [
  'none',
  'mint-sky',
  'crimson-gold',
  'amber-blaze',
  'ocean-indigo',
] as const

export type GradientId = (typeof GRADIENT_IDS)[number]

export const GRADIENT_DEFS: Record<GradientId, string> = {
  none: 'none',
  'mint-sky': 'linear-gradient(135deg, #e3ffe7 0%, #d9e7ff 50%, #c3f0ff 100%)',
  'crimson-gold': 'linear-gradient(135deg, #d53369 0%, #cb5e3c 50%, #daae51 100%)',
  'amber-blaze': 'linear-gradient(135deg, #fcff9e 0%, #f0a830 50%, #c67700 100%)',
  'ocean-indigo': 'linear-gradient(135deg, #00d2ff 0%, #1a7adb 50%, #3a47d5 100%)',
}

export const GRADIENT_LABELS: Record<GradientId, string> = {
  none: 'None',
  'mint-sky': 'Mint Sky',
  'crimson-gold': 'Crimson Gold',
  'amber-blaze': 'Amber Blaze',
  'ocean-indigo': 'Ocean Indigo',
}
