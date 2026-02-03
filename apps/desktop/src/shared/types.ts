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

// ── Project Management ───────────────────────────────────────

export type ProjectStatus = 'idle' | 'running' | 'done' | 'needs_input'

export interface Project {
  id: string
  name: string
  path: string
  status: ProjectStatus
  addedAt: number
}

export interface AddProjectRequest {
  path: string
}
