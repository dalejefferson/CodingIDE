/**
 * PTY-backed Terminal Service — runs in the main process.
 *
 * Manages node-pty instances per terminal ID. Data flows:
 *   - Renderer → main: write (user keystrokes)
 *   - Main → renderer: data events (PTY output) via callback
 *
 * Scrollback is capped per terminal to limit memory.
 */

import * as pty from 'node-pty'
import type { IPty } from 'node-pty'

const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24
const DEFAULT_SHELL = process.env.SHELL || '/bin/zsh'

/** Maximum scrollback lines per terminal to prevent unbounded memory growth */
export const MAX_SCROLLBACK_LINES = 5000

export type TerminalDataCallback = (terminalId: string, data: string) => void
export type TerminalExitCallback = (terminalId: string, exitCode: number) => void

interface TerminalInstance {
  pty: IPty
  buffer: string[]
  projectId: string
}

export class TerminalService {
  private terminals = new Map<string, TerminalInstance>()
  private onDataCallback: TerminalDataCallback | null = null
  private onExitCallback: TerminalExitCallback | null = null

  /** Register a callback for terminal output data */
  onData(callback: TerminalDataCallback): void {
    this.onDataCallback = callback
  }

  /** Register a callback for terminal exit events */
  onExit(callback: TerminalExitCallback): void {
    this.onExitCallback = callback
  }

  /** Create a new PTY-backed terminal */
  create(
    terminalId: string,
    projectId: string,
    cwd: string,
    cols = DEFAULT_COLS,
    rows = DEFAULT_ROWS,
  ): void {
    if (this.terminals.has(terminalId)) return

    const ptyProcess = pty.spawn(DEFAULT_SHELL, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: { ...process.env } as Record<string, string>,
    })

    const instance: TerminalInstance = {
      pty: ptyProcess,
      buffer: [],
      projectId,
    }

    ptyProcess.onData((data: string) => {
      this.appendToBuffer(instance, data)
      this.onDataCallback?.(terminalId, data)
    })

    ptyProcess.onExit(({ exitCode }) => {
      this.onExitCallback?.(terminalId, exitCode)
      this.terminals.delete(terminalId)
    })

    this.terminals.set(terminalId, instance)
  }

  /** Write data (user input) to a terminal */
  write(terminalId: string, data: string): void {
    this.terminals.get(terminalId)?.pty.write(data)
  }

  /** Resize a terminal */
  resize(terminalId: string, cols: number, rows: number): void {
    this.terminals.get(terminalId)?.pty.resize(cols, rows)
  }

  /** Kill a specific terminal */
  kill(terminalId: string): void {
    const instance = this.terminals.get(terminalId)
    if (!instance) return
    instance.pty.kill()
    this.terminals.delete(terminalId)
  }

  /** Kill all terminals for a project */
  killAllForProject(projectId: string): void {
    for (const [id, instance] of this.terminals) {
      if (instance.projectId === projectId) {
        instance.pty.kill()
        this.terminals.delete(id)
      }
    }
  }

  /** Kill all terminals */
  killAll(): void {
    for (const [id, instance] of this.terminals) {
      instance.pty.kill()
      this.terminals.delete(id)
    }
  }

  /** Check if a terminal exists */
  has(terminalId: string): boolean {
    return this.terminals.has(terminalId)
  }

  /** Get the scrollback buffer for a terminal (for replay on reconnect) */
  getBuffer(terminalId: string): string {
    const instance = this.terminals.get(terminalId)
    if (!instance) return ''
    return instance.buffer.join('\n')
  }

  /**
   * Append data to the scrollback buffer, capping at MAX_SCROLLBACK_LINES.
   * Splits incoming data by newlines and trims the oldest lines when over cap.
   */
  private appendToBuffer(instance: TerminalInstance, data: string): void {
    const lines = data.split('\n')
    instance.buffer.push(...lines)

    if (instance.buffer.length > MAX_SCROLLBACK_LINES) {
      instance.buffer.splice(0, instance.buffer.length - MAX_SCROLLBACK_LINES)
    }
  }
}

/**
 * Standalone scrollback cap function for testing purposes.
 * Takes a buffer array and caps it in place, returning the modified array.
 */
export function capScrollback(buffer: string[], maxLines: number): string[] {
  if (buffer.length > maxLines) {
    buffer.splice(0, buffer.length - maxLines)
  }
  return buffer
}
