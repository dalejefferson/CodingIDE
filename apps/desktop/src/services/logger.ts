import type { LogLevel, LogEntry } from '../shared/types'

/**
 * Ring-buffer logger — avoids GC pressure from repeated array slicing.
 *
 * Instead of push + slice (which allocates a new array every time the cap is
 * hit), entries are written into a fixed-size circular buffer. Only getLogs()
 * allocates, and it builds a chronologically-ordered snapshot on demand.
 */
class Logger {
  private buffer: (LogEntry | undefined)[] = []
  private head = 0
  private size = 0
  private readonly maxLogs = 1000

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = { level, message, timestamp: Date.now(), context }

    if (this.size < this.maxLogs) {
      // Buffer not yet full — append at (head + size) % maxLogs
      this.buffer[(this.head + this.size) % this.maxLogs] = entry
      this.size++
    } else {
      // Buffer full — overwrite the oldest entry at head, advance head
      this.buffer[this.head] = entry
      this.head = (this.head + 1) % this.maxLogs
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

  /** Return an immutable copy of all log entries in chronological order. */
  getLogs(): LogEntry[] {
    const result: LogEntry[] = []
    for (let i = 0; i < this.size; i++) {
      const entry = this.buffer[(this.head + i) % this.maxLogs]
      if (entry) result.push({ ...entry })
    }
    return result
  }

  clear(): void {
    this.buffer = []
    this.head = 0
    this.size = 0
  }
}

export const logger = new Logger()
