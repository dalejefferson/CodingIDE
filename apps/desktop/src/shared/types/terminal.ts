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
