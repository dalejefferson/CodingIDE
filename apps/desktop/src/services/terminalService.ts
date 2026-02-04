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
import type { CommandCompletionEvent, ClaudeActivityMap } from '@shared/types'

const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24
const DEFAULT_SHELL = process.env.SHELL || '/bin/zsh'

/** Maximum scrollback lines per terminal to prevent unbounded memory growth */
export const MAX_SCROLLBACK_LINES = 5000

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

interface TerminalInstance {
  pty: IPty
  buffer: string[]
  projectId: string
  /** Whether the terminal is currently executing a command */
  busy: boolean
  /** Timestamp (ms) when the terminal became busy */
  busySince: number
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
      busy: false,
      busySince: 0,
    }

    ptyProcess.onData((data: string) => {
      this.appendToBuffer(instance, data)
      this.detectPrompt(terminalId, instance, data)
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
    const instance = this.terminals.get(terminalId)
    if (!instance) return

    // Mark terminal as busy when user sends a newline (command execution)
    if (data.includes('\n') || data.includes('\r')) {
      instance.busy = true
      instance.busySince = Date.now()
    }

    instance.pty.write(data)
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
              pid: parseInt(parts[0], 10),
              ppid: parseInt(parts[1], 10),
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
