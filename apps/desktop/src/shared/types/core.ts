export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  context?: Record<string, unknown>
}

// ── Theming ──────────────────────────────────────────────────

/** Available theme identifiers. Cycle order: light → dark → light. */
export type ThemeId = 'light' | 'dark'

export const THEME_IDS: readonly ThemeId[] = ['light', 'dark'] as const

// ── Browser View Modes ─────────────────────────────────────

export type BrowserViewMode = 'closed' | 'split' | 'focused' | 'fullscreen' | 'pip'

export const BROWSER_VIEW_MODES: readonly BrowserViewMode[] = [
  'closed',
  'split',
  'focused',
  'fullscreen',
  'pip',
] as const
