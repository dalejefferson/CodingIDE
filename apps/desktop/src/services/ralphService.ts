/**
 * Ralph Loop execution service.
 *
 * Manages the lifecycle of Ralph processes: creating worktrees,
 * spawning the Claude CLI, tracking status, and stopping processes.
 *
 * Each ticket gets its own isolated worktree directory with a
 * `.claude/prd.md` file that feeds the Claude CLI.
 *
 * Worktree creation and PRD building are in their own modules:
 *   - ralphWorktree.ts — git worktree creation + slugify helper
 *   - ralphPRDBuilder.ts — PRD content generation from ticket
 */

import { spawn, type ChildProcess } from 'node:child_process'
import type { Ticket, RalphStatusResponse } from '@shared/types'
import { logger } from '@services/logger'
import { createWorktree } from './ralphWorktree'
import { buildPRD } from './ralphPRDBuilder'

// ── Types ──────────────────────────────────────────────────────

interface RalphProcess {
  process: ChildProcess | null
  running: boolean
  iteration: number
  log: string
  worktreePath: string
}

type StatusCallback = (ticketId: string, running: boolean, iteration: number) => void

// ── Constants ──────────────────────────────────────────────────

/** Maximum characters kept in the log buffer to prevent memory bloat. */
const MAX_LOG_LENGTH = 10_000

/** Grace period (ms) before escalating SIGTERM to SIGKILL. */
const KILL_GRACE_MS = 500

// ── Helpers ────────────────────────────────────────────────────

/**
 * Truncate a string to keep only the last `max` characters.
 * Avoids unbounded memory growth from long-running processes.
 */
function truncateLog(log: string, max: number = MAX_LOG_LENGTH): string {
  if (log.length <= max) return log
  return log.slice(-max)
}

/**
 * Simple heuristic to detect "iteration steps" in Claude CLI output.
 * Counts lines containing fenced code blocks (```) or markdown
 * section headers (## ) as progress markers.
 */
function isIterationMarker(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('```') || trimmed.startsWith('## ')
}

// ── Service ────────────────────────────────────────────────────

class RalphService {
  private processes = new Map<string, RalphProcess>()
  private onStatusChange: StatusCallback

  constructor(onStatusChange: StatusCallback) {
    this.onStatusChange = onStatusChange
  }

  // ── Worktree creation ──────────────────────────────────────

  /**
   * Create an isolated worktree directory for a ticket.
   * Delegates to ralphWorktree.ts.
   *
   * @returns The full path to the created worktree directory.
   */
  createWorktree(ticket: Ticket): string {
    return createWorktree(ticket)
  }

  // ── Execution ──────────────────────────────────────────────

  /**
   * Start the Claude CLI for a ticket.
   *
   * Prerequisites:
   *   - `ticket.worktreePath` must be set (directory exists)
   *   - `ticket.prd` must be non-null and approved
   *
   * The PRD content is written to `.claude/prd.md` in the worktree,
   * then piped as stdin to `claude --print --dangerously-skip-permissions`.
   */
  execute(ticket: Ticket): void {
    // Prevent duplicate execution
    const existing = this.processes.get(ticket.id)
    if (existing?.running) {
      logger.warn('Ralph: already running, ignoring execute', { ticketId: ticket.id })
      return
    }

    // Build and write PRD (validates worktreePath and prd)
    const prdContent = buildPRD(ticket)
    const worktreePath = ticket.worktreePath!

    // Spawn Claude CLI
    const child = spawn('claude', ['--print', '--dangerously-skip-permissions'], {
      cwd: worktreePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    })

    const entry: RalphProcess = {
      process: child,
      running: true,
      iteration: 0,
      log: '',
      worktreePath,
    }

    this.processes.set(ticket.id, entry)
    this.onStatusChange(ticket.id, true, 0)
    logger.info('Ralph: spawned claude CLI', { ticketId: ticket.id, pid: child.pid })

    // Send PRD content as stdin
    if (child.stdin) {
      child.stdin.write(prdContent)
      child.stdin.end()
    }

    // Collect stdout
    if (child.stdout) {
      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        entry.log = truncateLog(entry.log + text)

        // Count iteration markers in this chunk
        const lines = text.split('\n')
        for (const line of lines) {
          if (isIterationMarker(line)) {
            entry.iteration++
            this.onStatusChange(ticket.id, entry.running, entry.iteration)
          }
        }
      })
    }

    // Collect stderr (append to same log)
    if (child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => {
        entry.log = truncateLog(entry.log + chunk.toString())
      })
    }

    // Handle process exit
    child.on('exit', (code, signal) => {
      entry.running = false
      entry.process = null
      this.onStatusChange(ticket.id, false, entry.iteration)
      logger.info('Ralph: process exited', {
        ticketId: ticket.id,
        code,
        signal,
      })
    })

    // Handle spawn errors (e.g. command not found)
    child.on('error', (err) => {
      entry.running = false
      entry.process = null
      entry.log = truncateLog(entry.log + `\n[ERROR] ${err.message}\n`)
      this.onStatusChange(ticket.id, false, entry.iteration)
      logger.error('Ralph: process error', {
        ticketId: ticket.id,
        error: err.message,
      })
    })
  }

  // ── Status query ───────────────────────────────────────────

  /** Return the current status of a Ralph process for a ticket. */
  getStatus(ticketId: string): RalphStatusResponse {
    const entry = this.processes.get(ticketId)
    if (!entry) {
      return { running: false, iteration: 0, log: '' }
    }
    return {
      running: entry.running,
      iteration: entry.iteration,
      log: entry.log,
    }
  }

  // ── Stop ───────────────────────────────────────────────────

  /**
   * Stop a running Ralph process.
   *
   * Sends SIGTERM first for a graceful shutdown. If the process is
   * still alive after 500 ms, escalates to SIGKILL on the process group.
   */
  stop(ticketId: string): void {
    const entry = this.processes.get(ticketId)
    if (!entry || !entry.process || !entry.running) {
      logger.warn('Ralph: nothing to stop', { ticketId })
      return
    }

    const child = entry.process
    const pid = child.pid

    // Send SIGTERM to process group
    try {
      if (pid) process.kill(-pid, 'SIGTERM')
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'EPERM' && code !== 'ESRCH') {
        logger.error('Ralph: SIGTERM failed', { ticketId, error: String(err) })
      }
    }

    // Escalate to SIGKILL after grace period
    setTimeout(() => {
      try {
        if (pid && entry.running) {
          process.kill(-pid, 'SIGKILL')
        }
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException).code
        if (code !== 'EPERM' && code !== 'ESRCH') {
          logger.error('Ralph: SIGKILL failed', { ticketId, error: String(err) })
        }
      }
    }, KILL_GRACE_MS)

    entry.running = false
    entry.process = null
    this.onStatusChange(ticketId, false, entry.iteration)
    logger.info('Ralph: stop requested', { ticketId })
  }

  // ── Convenience ────────────────────────────────────────────

  /** Check whether a Ralph process is currently running for a ticket. */
  isRunning(ticketId: string): boolean {
    const entry = this.processes.get(ticketId)
    return entry?.running ?? false
  }
}

export { RalphService }
export type { StatusCallback }
