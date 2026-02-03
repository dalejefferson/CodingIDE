export interface AppInfo {
  name: string
  version: string
  platform: NodeJS.Platform
  arch: string
}

export interface WindowState {
  isMaximized: boolean
  isMinimized: boolean
  isFocused: boolean
}

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

// ── Project Management ───────────────────────────────────────

export type ProjectStatus = 'idle' | 'running' | 'done' | 'needs_input'

export interface Project {
  id: string
  name: string
  path: string
  status: ProjectStatus
  addedAt: number
  /** Optional per-project theme override. When set, overrides the global theme. */
  theme?: ThemeId
}

export interface AddProjectRequest {
  path: string
}

/**
 * Request to set (or clear) a project's theme override.
 * Pass `theme: null` to remove the override and fall back to global theme.
 */
export interface SetProjectThemeRequest {
  id: string
  theme: ThemeId | null
}

// ── Terminal ─────────────────────────────────────────────────

export interface TerminalCreateRequest {
  projectId: string
  terminalId: string
  cwd: string
  cols?: number
  rows?: number
}

export interface TerminalWriteRequest {
  terminalId: string
  data: string
}

export interface TerminalResizeRequest {
  terminalId: string
  cols: number
  rows: number
}

export interface TerminalKillRequest {
  terminalId: string
}

export interface TerminalLayoutRequest {
  projectId: string
}

export interface TerminalSetLayoutRequest {
  projectId: string
  layout: unknown
}

// ── Git ─────────────────────────────────────────────────────

export interface GitBranchRequest {
  cwd: string
}

export interface GitBranchResponse {
  branch: string | null
}
