/**
 * Claude process detection utilities for the Terminal Service.
 *
 * Scans PTY child process trees for "claude" processes and determines
 * whether Claude is actively generating output or waiting.
 */

import { execFile } from 'node:child_process'
import type { ClaudeActivityMap, ClaudeStatusMap } from '@shared/types'

/** How long (ms) after last PTY output before we consider Claude "waiting" instead of "generating" */
export const CLAUDE_OUTPUT_IDLE_MS = 2500

/** Minimal shape required from a terminal instance for Claude detection */
export interface ClaudeDetectionState {
  projectId: string
  pid: number
  lastOutputAt: number
}

/** Parse `ps` output into structured process records */
function parseProcessList(stdout: string): {
  childrenOf: Map<number, number[]>
  commByPid: Map<number, string>
} {
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

  return { childrenOf, commByPid }
}

/** Walk the descendant tree of a PID and count "claude" processes */
function countClaudeDescendants(
  rootPid: number,
  childrenOf: Map<number, number[]>,
  commByPid: Map<number, string>,
): number {
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
  return count
}

/**
 * Scan all PTY child process trees for "claude" processes.
 * Returns a map of projectId → count of active Claude instances.
 */
export function getClaudeActivity(terminals: ClaudeDetectionState[]): Promise<ClaudeActivityMap> {
  const pids = terminals.filter((t) => t.pid > 0)

  if (pids.length === 0) return Promise.resolve({})

  return new Promise((resolve) => {
    execFile('ps', ['-eo', 'pid,ppid,comm'], { timeout: 3000 }, (error, stdout) => {
      if (error) {
        resolve({})
        return
      }

      const { childrenOf, commByPid } = parseProcessList(stdout)

      const activity: ClaudeActivityMap = {}
      for (const { pid: rootPid, projectId } of pids) {
        const count = countClaudeDescendants(rootPid, childrenOf, commByPid)
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
export function computeClaudeOutputStatus(
  activity: ClaudeActivityMap,
  terminals: ClaudeDetectionState[],
): ClaudeStatusMap {
  const now = Date.now()
  const result: ClaudeStatusMap = {}

  for (const [projectId, count] of Object.entries(activity)) {
    if (count <= 0) continue

    let hasRecentOutput = false
    for (const instance of terminals) {
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
 * Combined Claude status — single `ps` invocation returns both activity and output status.
 * Avoids the double subprocess spawn that happened when getClaudeActivity()
 * and getClaudeOutputStatus() were called separately.
 */
export function getClaudeFullStatus(
  terminals: ClaudeDetectionState[],
): Promise<{ activity: ClaudeActivityMap; status: ClaudeStatusMap }> {
  const pids = terminals.filter((t) => t.pid > 0)

  if (pids.length === 0) return Promise.resolve({ activity: {}, status: {} })

  return new Promise((resolve) => {
    execFile('ps', ['-eo', 'pid,ppid,comm'], { timeout: 3000 }, (error, stdout) => {
      if (error) {
        resolve({ activity: {}, status: {} })
        return
      }

      const { childrenOf, commByPid } = parseProcessList(stdout)

      const activity: ClaudeActivityMap = {}
      for (const { pid: rootPid, projectId } of pids) {
        const count = countClaudeDescendants(rootPid, childrenOf, commByPid)
        if (count > 0) {
          activity[projectId] = (activity[projectId] ?? 0) + count
        }
      }

      const status = computeClaudeOutputStatus(activity, terminals)

      resolve({ activity, status })
    })
  })
}
