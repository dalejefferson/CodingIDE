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
import { execFile } from 'node:child_process'
import type { CommandCompletionEvent, ClaudeActivityMap, ClaudeStatusMap } from '@shared/types'

const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24
const DEFAULT_SHELL = process.env.SHELL || '/bin/zsh'

/** Maximum scrollback lines per terminal to prevent unbounded memory growth */
export const MAX_SCROLLBACK_LINES = 5000

/** Approximate character budget for raw scrollback storage (~120 chars/line) */
const MAX_SCROLLBACK_CHARS = MAX_SCROLLBACK_LINES * 120

/**
 * Minimum command duration (ms) before firing a completion event.
 * Very fast commands (e.g. pressing Enter on an empty prompt) are
 * suppressed to avoid notification noise.
 */
const MIN_COMMAND_DURATION_MS = 500

/**
 * Shell prompt heuristic: matches common trailing prompt characters.
 * Strips ANSI escape codes first, then looks for a line ending with
 * `$`, `%`, `>`, or `#` followed by optional whitespace.
 */
const PROMPT_RE = /[$%>#]\s*$/

/** Strip ANSI escape sequences from a string for prompt detection */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
}

export type TerminalDataCallback = (terminalId: string, data: string) => void
export type TerminalExitCallback = (terminalId: string, exitCode: number) => void
export type CommandDoneCallback = (event: CommandCompletionEvent) => void

/** How long (ms) after last PTY output before we consider Claude "waiting" instead of "generating" */
const CLAUDE_OUTPUT_IDLE_MS = 2500

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
    }

    ptyProcess.onData((data: string) => {
      instance.lastOutputAt = Date.now()
      // Suppress buffer writes briefly after resize to avoid storing
      // SIGWINCH-triggered prompt reprints in the scrollback
      const isResizeEcho = Date.now() - instance.lastResizedAt < 150
      if (!isResizeEcho) {
        this.appendToBuffer(instance, data)
      }
      this.detectPrompt(terminalId, instance, data)
      this.onDataCallback?.(terminalId, data)
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

  /**
   * Detect shell prompt in PTY output. When a busy terminal outputs a line
   * matching common prompt patterns, we infer the previous command completed.
   */
  private detectPrompt(terminalId: string, instance: TerminalInstance, data: string): void {
    if (!instance.busy) return

    const cleaned = stripAnsi(data)
    if (!PROMPT_RE.test(cleaned)) return

    const elapsed = Date.now() - instance.busySince
    instance.busy = false

    if (elapsed < MIN_COMMAND_DURATION_MS) return

    this.onCommandDoneCallback?.({
      terminalId,
      projectId: instance.projectId,
      elapsedMs: elapsed,
    })
  }

  /**
   * Scan all PTY child process trees for "claude" processes.
   * Returns a map of projectId → count of active Claude instances.
   */
  getClaudeActivity(): Promise<ClaudeActivityMap> {
    const pids: { pid: number; projectId: string }[] = []
    for (const [, instance] of this.terminals) {
      const pid = instance.pty.pid
      if (pid > 0) {
        pids.push({ pid, projectId: instance.projectId })
      }
    }

    if (pids.length === 0) return Promise.resolve({})

    return new Promise((resolve) => {
      // Use ps to find all processes whose command contains "claude"
      // and check if they are descendants of any of our PTY PIDs
      execFile('ps', ['-eo', 'pid,ppid,comm'], { timeout: 3000 }, (error, stdout) => {
        if (error) {
          resolve({})
          return
        }

        // Build parent→children map
        const lines = stdout.trim().split('\n').slice(1) // skip header
        const procs: { pid: number; ppid: number; comm: string }[] = []
        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 3) {
            procs.push({
              pid: parseInt(parts[0]!, 10),
              ppid: parseInt(parts[1]!, 10),
              comm: parts.slice(2).join(' '),
            })
          }
        }

        const childrenOf = new Map<number, number[]>()
        for (const p of procs) {
          if (!childrenOf.has(p.ppid)) childrenOf.set(p.ppid, [])
          childrenOf.get(p.ppid)!.push(p.pid)
        }

        const commByPid = new Map<number, string>()
        for (const p of procs) {
          commByPid.set(p.pid, p.comm)
        }

        // For each PTY, walk the descendant tree and count "claude" processes
        const activity: ClaudeActivityMap = {}
        for (const { pid: rootPid, projectId } of pids) {
          let count = 0
          const stack = [rootPid]
          while (stack.length > 0) {
            const current = stack.pop()!
            const children = childrenOf.get(current) ?? []
            for (const childPid of children) {
              const comm = commByPid.get(childPid) ?? ''
              if (comm.toLowerCase().includes('claude')) {
                count++
              }
              stack.push(childPid)
            }
          }
          if (count > 0) {
            activity[projectId] = (activity[projectId] ?? 0) + count
          }
        }

        resolve(activity)
      })
    })
  }

  /**
   * Determine per-project Claude output status by combining process detection
   * with terminal output recency. Returns 'generating' if Claude is active AND
   * terminal output was received within CLAUDE_OUTPUT_IDLE_MS, or 'waiting' if
   * Claude is active but the terminal has gone quiet.
   */
  async getClaudeOutputStatus(): Promise<ClaudeStatusMap> {
    const activity = await this.getClaudeActivity()
    const now = Date.now()
    const result: ClaudeStatusMap = {}

    for (const [projectId, count] of Object.entries(activity)) {
      if (count <= 0) continue

      // Check if any terminal for this project had recent output
      let hasRecentOutput = false
      for (const [, instance] of this.terminals) {
        if (
          instance.projectId === projectId &&
          instance.lastOutputAt > 0 &&
          now - instance.lastOutputAt < CLAUDE_OUTPUT_IDLE_MS
        ) {
          hasRecentOutput = true
          break
        }
      }

      result[projectId] = hasRecentOutput ? 'generating' : 'waiting'
    }

    return result
  }

  /**
   * Append raw PTY data to the scrollback buffer.
   * Stores chunks verbatim (no split/join) so escape sequences like \r
   * are preserved exactly, preventing duplicate prompt artifacts on replay.
   * Caps total character count to limit memory.
   */
  private appendToBuffer(instance: TerminalInstance, data: string): void {
    instance.buffer.push(data)

    let totalLen = 0
    for (const chunk of instance.buffer) totalLen += chunk.length
    while (totalLen > MAX_SCROLLBACK_CHARS && instance.buffer.length > 1) {
      totalLen -= instance.buffer[0]!.length
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
