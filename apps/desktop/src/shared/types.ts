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

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'idle',
  'running',
  'done',
  'needs_input',
] as const

/** Request to update a project's status from the main process. */
export interface SetProjectStatusRequest {
  id: string
  status: ProjectStatus
}

/** Broadcast payload when a project's status changes. */
export interface ProjectStatusChange {
  id: string
  status: ProjectStatus
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

// ── Terminal Command Completion ──────────────────────────────

/**
 * Emitted when a terminal command completes (best-effort detection).
 *
 * Detection method: shell prompt heuristics. The service tracks a "busy"
 * flag per terminal (set when user writes a newline, cleared when a
 * shell prompt pattern is detected in PTY output). When the flag
 * transitions from busy→idle, a completion event fires.
 *
 * Known limitations:
 *   - Prompt detection relies on common patterns ($ % > #); custom PS1
 *     values with no trailing marker may be missed.
 *   - Multi-line commands or commands that print a prompt-like string
 *     in their output may trigger false positives.
 *   - Very fast commands (<100 ms) are debounced to avoid noise.
 */
export interface CommandCompletionEvent {
  terminalId: string
  projectId: string
  /** Approximate wall-clock duration in milliseconds */
  elapsedMs: number
}

// ── Claude Activity ─────────────────────────────────────────

/** Per-project Claude activity counts broadcast from the main process. */
export interface ClaudeActivityMap {
  /** projectId → number of active Claude processes */
  [projectId: string]: number
}

/** Whether Claude is actively generating output or waiting for user input. */
export type ClaudeStatus = 'generating' | 'waiting'

/** Per-project Claude status: generating (output flowing) or waiting (idle, needs input). */
export interface ClaudeStatusMap {
  [projectId: string]: ClaudeStatus
}

/** Emitted when Claude finishes generating in a project (activity transitions >0 → 0). */
export interface ClaudeDoneEvent {
  projectId: string
}

// ── Command Presets ─────────────────────────────────────────

export interface CommandPreset {
  id: string
  name: string
  command: string
}

export interface SetPresetsRequest {
  presets: CommandPreset[]
}

// ── Native Notifications ────────────────────────────────────

export interface NativeNotifyRequest {
  title: string
  body?: string
}

// ── Browser View Modes ─────────────────────────────────────

export type BrowserViewMode = 'closed' | 'split' | 'focused' | 'fullscreen' | 'pip'

// ── Browser / Element Picker ────────────────────────────────

/** Payload produced by the element picker when user clicks an element in the browser pane. */
export interface ElementPickerPayload {
  /** CSS selector that uniquely targets the element */
  selector: string
  /** Trimmed innerText (max 200 chars) */
  innerText: string
  /** HTML tag name (lowercase) */
  tag: string
  /** Element id attribute, or null */
  id: string | null
  /** List of CSS class names */
  classes: string[]
  /** Key attributes (href, src, type, role, aria-label, data-testid) */
  attributes: Record<string, string>
}

/** Request to navigate the embedded browser to a URL. */
export interface BrowserNavigateRequest {
  url: string
}

// ── Git ─────────────────────────────────────────────────────

export interface GitBranchRequest {
  cwd: string
}

export interface GitBranchResponse {
  branch: string | null
}
