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
