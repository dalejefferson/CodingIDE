/**
 * Mobile-friendly color palettes for Expo app PRD wizard.
 *
 * Each palette provides a coordinated set of colors suitable for
 * React Native / mobile UI: primary, secondary, accent, background,
 * surface, and text.
 */

import type { MobileAppPalette } from './types'

export const MOBILE_PALETTES: readonly MobileAppPalette[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#0077B6',
      secondary: '#00B4D8',
      accent: '#90E0EF',
      background: '#CAF0F8',
      surface: '#FFFFFF',
      text: '#03045E',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#E85D04',
      secondary: '#F48C06',
      accent: '#FAA307',
      background: '#FFF3E0',
      surface: '#FFFFFF',
      text: '#370617',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#2D6A4F',
      secondary: '#40916C',
      accent: '#52B788',
      background: '#D8F3DC',
      surface: '#FFFFFF',
      text: '#1B4332',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      primary: '#7B2CBF',
      secondary: '#9D4EDD',
      accent: '#C77DFF',
      background: '#10002B',
      surface: '#240046',
      text: '#E0AAFF',
    },
  },
  {
    id: 'coral',
    name: 'Coral',
    colors: {
      primary: '#E63946',
      secondary: '#F4845F',
      accent: '#F7B267',
      background: '#FFF1E6',
      surface: '#FFFFFF',
      text: '#1D3557',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    colors: {
      primary: '#7209B7',
      secondary: '#B5179E',
      accent: '#F72585',
      background: '#F8F0FC',
      surface: '#FFFFFF',
      text: '#3C096C',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    colors: {
      primary: '#4361EE',
      secondary: '#4895EF',
      accent: '#4CC9F0',
      background: '#EDF2FB',
      surface: '#FFFFFF',
      text: '#0B132B',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    colors: {
      primary: '#D00000',
      secondary: '#E85D04',
      accent: '#FFBA08',
      background: '#1A1A2E',
      surface: '#16213E',
      text: '#EAEAEA',
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    colors: {
      primary: '#06D6A0',
      secondary: '#1B9AAA',
      accent: '#EF476F',
      background: '#F0FFF4',
      surface: '#FFFFFF',
      text: '#073B3A',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    colors: {
      primary: '#475569',
      secondary: '#64748B',
      accent: '#3B82F6',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#0F172A',
    },
  },
] as const

export const PALETTE_IDS = MOBILE_PALETTES.map((p) => p.id) as readonly string[]
