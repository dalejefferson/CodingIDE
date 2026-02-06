/**
 * PTY-backed Terminal Service — runs in the main process.
 *
 * Manages node-pty instances per terminal ID. Data flows:
 *   - Renderer → main: write (user keystrokes)
 *   - Main → renderer: data events (PTY output) via callback
 *
 * Scrollback is capped per terminal to limit memory.
 *
 * Claude detection and command completion logic are in their own modules:
 *   - terminalClaudeDetection.ts — process tree scanning for Claude
 *   - terminalCommandCompletion.ts — prompt heuristic for busy-flag tracking
 */

import * as pty from 'node-pty'
import type { IPty } from 'node-pty'
import type { ClaudeActivityMap, ClaudeStatusMap } from '@shared/types'
import {
  getClaudeActivity as _getClaudeActivity,
  getClaudeFullStatus as _getClaudeFullStatus,
  computeClaudeOutputStatus,
  type ClaudeDetectionState,
} from './terminalClaudeDetection'
import { detectPrompt, type CommandDoneCallback } from './terminalCommandCompletion'

const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24
const DEFAULT_SHELL = process.env.SHELL || '/bin/zsh'

/** Maximum scrollback lines per terminal to prevent unbounded memory growth */
export const MAX_SCROLLBACK_LINES = 5000

/** Approximate character budget for raw scrollback storage (~120 chars/line) */
const MAX_SCROLLBACK_CHARS = MAX_SCROLLBACK_LINES * 120

export type TerminalDataCallback = (terminalId: string, data: string) => void
export type TerminalExitCallback = (terminalId: string, exitCode: number) => void
export type { CommandDoneCallback }

interface TerminalInstance {
  pty: IPty
  buffer: string[]
  projectId: string
  /** Whether the terminal is currently executing a command */
  busy: boolean
  /** Timestamp (ms) when the terminal became busy */
  busySince: number
  /** Timestamp (ms) of the most recent PTY data output */
  lastOutputAt: number
  /** Timestamp (ms) of the most recent PTY resize (for SIGWINCH echo suppression) */
  lastResizedAt: number
  /** Running total of buffer character length (avoids O(n) rescan) */
  bufferTotalLen: number
}

export class TerminalService {
  private terminals = new Map<string, TerminalInstance>()
  private onDataCallback: TerminalDataCallback | null = null
  private onExitCallback: TerminalExitCallback | null = null
  private onCommandDoneCallback: CommandDoneCallback | null = null

  /** Register a callback for terminal output data */
  onData(callback: TerminalDataCallback): void {
    this.onDataCallback = callback
  }

  /** Register a callback for terminal exit events */
  onExit(callback: TerminalExitCallback): void {
    this.onExitCallback = callback
  }

  /** Register a callback for command completion events */
  onCommandDone(callback: CommandDoneCallback): void {
    this.onCommandDoneCallback = callback
  }

  /** Create a new PTY-backed terminal. Returns true if a new PTY was spawned. */
  create(
    terminalId: string,
    projectId: string,
    cwd: string,
    cols = DEFAULT_COLS,
    rows = DEFAULT_ROWS,
  ): boolean {
    if (this.terminals.has(terminalId)) return false

    const safeCols = cols >= 10 ? cols : DEFAULT_COLS
    const safeRows = rows >= 2 ? rows : DEFAULT_ROWS

    const ptyProcess = pty.spawn(DEFAULT_SHELL, [], {
      name: 'xterm-256color',
      cols: safeCols,
      rows: safeRows,
      cwd,
      env: { ...process.env } as Record<string, string>,
    })

    const instance: TerminalInstance = {
      pty: ptyProcess,
      buffer: [],
      projectId,
      busy: false,
      busySince: 0,
      lastOutputAt: 0,
      lastResizedAt: 0,
      bufferTotalLen: 0,
    }

    ptyProcess.onData((data: string) => {
      instance.lastOutputAt = Date.now()
      // Suppress buffer writes AND live forwarding briefly after resize to
      // avoid SIGWINCH-triggered prompt reprints appearing in the terminal
      const isResizeEcho = Date.now() - instance.lastResizedAt < 150
      if (!isResizeEcho) {
        this.appendToBuffer(instance, data)
      }
      detectPrompt(terminalId, instance, data, this.onCommandDoneCallback)
      if (!isResizeEcho) {
        this.onDataCallback?.(terminalId, data)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      this.onExitCallback?.(terminalId, exitCode)
      this.terminals.delete(terminalId)
    })

    this.terminals.set(terminalId, instance)
    return true
  }

  /** Write data (user input) to a terminal */
  write(terminalId: string, data: string): void {
    const instance = this.terminals.get(terminalId)
    if (!instance) return

    // Mark terminal as busy when user sends a newline (command execution)
    if (data.includes('\n') || data.includes('\r')) {
      instance.busy = true
      instance.busySince = Date.now()
    }

    instance.pty.write(data)
  }

  /** Resize a terminal — ignores pathologically small values to prevent staircase rendering */
  resize(terminalId: string, cols: number, rows: number): void {
    if (cols < 10 || rows < 2) return
    const instance = this.terminals.get(terminalId)
    if (!instance) return
    instance.lastResizedAt = Date.now()
    instance.pty.resize(cols, rows)
  }

  /** Kill a specific terminal */
  kill(terminalId: string): void {
    const instance = this.terminals.get(terminalId)
    if (!instance) return
    this.forceKillPty(instance)
    this.terminals.delete(terminalId)
  }

  /** Kill all terminals for a project */
  killAllForProject(projectId: string): void {
    for (const [id, instance] of this.terminals) {
      if (instance.projectId === projectId) {
        this.forceKillPty(instance)
        this.terminals.delete(id)
      }
    }
  }

  /** Kill all terminals */
  killAll(): void {
    for (const [id, instance] of this.terminals) {
      this.forceKillPty(instance)
      this.terminals.delete(id)
    }
  }

  /**
   * Force-kill a PTY and its entire process tree.
   * Sends SIGTERM to the process group first (kills shell + all children),
   * then SIGKILL after a timeout if anything survives.
   */
  private forceKillPty(instance: TerminalInstance): void {
    const pid = instance.pty.pid
    if (pid <= 0) return

    // Kill entire process group with SIGTERM (negative PID = process group)
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      // Process group may already be dead
    }

    // Also call pty.kill() for node-pty internal cleanup
    try {
      instance.pty.kill()
    } catch {
      // May already be dead
    }

    // SIGKILL fallback after 500ms if process is still alive
    setTimeout(() => {
      try {
        process.kill(pid, 0) // Throws if process is dead — that's good
        process.kill(-pid, 'SIGKILL')
      } catch {
        // Already dead
      }
    }, 500)
  }

  /** Check if a terminal exists */
  has(terminalId: string): boolean {
    return this.terminals.has(terminalId)
  }

  /** Get the scrollback buffer for a terminal (for replay on reconnect) */
  getBuffer(terminalId: string): string {
    const instance = this.terminals.get(terminalId)
    if (!instance) return ''
    return instance.buffer.join('')
  }

  /** Collect detection state from all terminals for Claude scanning */
  private collectDetectionState(): ClaudeDetectionState[] {
    const states: ClaudeDetectionState[] = []
    for (const [, instance] of this.terminals) {
      states.push({
        projectId: instance.projectId,
        pid: instance.pty.pid,
        lastOutputAt: instance.lastOutputAt,
      })
    }
    return states
  }

  /**
   * Scan all PTY child process trees for "claude" processes.
   * Returns a map of projectId → count of active Claude instances.
   */
  getClaudeActivity(): Promise<ClaudeActivityMap> {
    return _getClaudeActivity(this.collectDetectionState())
  }

  /**
   * Determine per-project Claude output status by combining process detection
   * with terminal output recency.
   */
  async getClaudeOutputStatus(): Promise<ClaudeStatusMap> {
    const activity = await this.getClaudeActivity()
    return computeClaudeOutputStatus(activity, this.collectDetectionState())
  }

  /**
   * Combined Claude status — single `ps` invocation returns both activity and output status.
   */
  getClaudeFullStatus(): Promise<{ activity: ClaudeActivityMap; status: ClaudeStatusMap }> {
    return _getClaudeFullStatus(this.collectDetectionState())
  }

  /** Check if any terminals are alive */
  hasAny(): boolean {
    return this.terminals.size > 0
  }

  /**
   * Append raw PTY data to the scrollback buffer.
   * Stores chunks verbatim (no split/join) so escape sequences like \r
   * are preserved exactly, preventing duplicate prompt artifacts on replay.
   * Caps total character count to limit memory.
   */
  private appendToBuffer(instance: TerminalInstance, data: string): void {
    instance.buffer.push(data)
    instance.bufferTotalLen += data.length
    while (instance.bufferTotalLen > MAX_SCROLLBACK_CHARS && instance.buffer.length > 1) {
      instance.bufferTotalLen -= instance.buffer[0]!.length
      instance.buffer.shift()
    }
  }
}

/**
 * Standalone scrollback cap function for testing purposes.
 * Caps total character count in a raw-chunk buffer, dropping oldest chunks.
 */
export function capScrollback(buffer: string[], maxChars: number): string[] {
  let totalLen = 0
  for (const chunk of buffer) totalLen += chunk.length
  while (totalLen > maxChars && buffer.length > 1) {
    totalLen -= buffer[0]!.length
    buffer.shift()
  }
  return buffer
}
