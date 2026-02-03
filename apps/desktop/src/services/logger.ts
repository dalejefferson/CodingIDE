import type { LogLevel, LogEntry } from '../shared/types'

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 1000

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = { level, message, timestamp: Date.now(), context }
    this.logs.push(entry)

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    const prefix = `[${level.toUpperCase()}]`
    const formatted = `${prefix} ${message}`
    const extra = context ?? ''

    switch (level) {
      case 'debug':
        console.debug(formatted, extra)
        break
      case 'info':
        console.info(formatted, extra)
        break
      case 'warn':
        console.warn(formatted, extra)
        break
      case 'error':
        console.error(formatted, extra)
        break
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context)
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clear(): void {
    this.logs = []
  }
}

export const logger = new Logger()
