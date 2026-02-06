/**
 * Claude Activity Polling — Adaptive Backoff
 *
 * Polls terminal buffers for Claude activity indicators using a recursive
 * setTimeout chain with exponential backoff. Polls fast (2s) when Claude
 * is active and slows down (up to 30s) when idle. Detects status
 * transitions (idle → running → done) and broadcasts changes to the
 * renderer. Uses shallow-equality diffing to suppress redundant IPC
 * (~95% reduction in steady state).
 */

import { shallowEqual, broadcastStatusChange } from './ipcHelpers'
import type { TerminalService } from '@services/terminalService'
import type { ProjectStore } from '@services/projectStore'

/** Fast polling when Claude is actively running */
const MIN_POLL_MS = 2_000
/** Slow polling ceiling when idle */
const MAX_POLL_MS = 30_000
/** How quickly we ramp toward MAX_POLL_MS when idle */
const BACKOFF_MULTIPLIER = 1.5

export interface ClaudePollingState {
  /** Call to stop the polling loop and release the timer. */
  dispose: () => void
  lastActivity: Record<string, number>
  lastStatus: Record<string, string>
}

export function setupClaudePolling(
  terminalService: TerminalService,
  projectStore: ProjectStore,
  sendToRendererFn: (channel: string, ...args: unknown[]) => void,
): ClaudePollingState {
  let lastClaudeActivity: Record<string, number> = {}
  let lastClaudeStatus: Record<string, string> = {}
  let pollIntervalMs = 5_000
  let timerId: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  async function poll(): Promise<void> {
    if (disposed) return

    // Early exit: skip poll if no terminals exist
    if (!terminalService.hasAny()) {
      // Clear stale data if terminals were destroyed
      if (Object.keys(lastClaudeActivity).length > 0) {
        lastClaudeActivity = {}
        lastClaudeStatus = {}
        sendToRendererFn('claude:activity', {})
        sendToRendererFn('claude:status', {})
      }
      scheduleNext()
      return
    }

    const { activity, status: statusMap } = await terminalService.getClaudeFullStatus()

    // Detect status transitions from Claude activity changes
    for (const projectId of Object.keys(activity)) {
      const prev = lastClaudeActivity[projectId] ?? 0
      if (prev === 0 && (activity[projectId] ?? 0) > 0) {
        projectStore.setStatus(projectId, 'running')
        broadcastStatusChange(projectId, 'running')
      }
    }
    for (const projectId of Object.keys(lastClaudeActivity)) {
      if ((lastClaudeActivity[projectId] ?? 0) > 0 && (activity[projectId] ?? 0) === 0) {
        projectStore.setStatus(projectId, 'done')
        broadcastStatusChange(projectId, 'done')
        sendToRendererFn('claude:done', { projectId })
      }
    }

    // Only broadcast if values actually changed (avoids ~95% of unnecessary IPC)
    const activityChanged = !shallowEqual(
      activity as Record<string, unknown>,
      lastClaudeActivity as Record<string, unknown>,
    )
    const statusChanged = !shallowEqual(
      statusMap as Record<string, unknown>,
      lastClaudeStatus as Record<string, unknown>,
    )

    lastClaudeActivity = { ...activity }
    lastClaudeStatus = { ...statusMap }

    if (activityChanged || statusChanged) {
      if (activityChanged) sendToRendererFn('claude:activity', activity)
      if (statusChanged) sendToRendererFn('claude:status', statusMap)
    }

    // ── Adaptive backoff ───────────────────────────────────────
    const hasActivity = Object.values(activity).some((count) => count > 0)
    if (hasActivity) {
      // Claude is working — poll as fast as possible
      pollIntervalMs = MIN_POLL_MS
    } else {
      // Idle — exponentially back off up to the ceiling
      pollIntervalMs = Math.min(pollIntervalMs * BACKOFF_MULTIPLIER, MAX_POLL_MS)
    }

    scheduleNext()
  }

  function scheduleNext(): void {
    if (disposed) return
    timerId = setTimeout(poll, pollIntervalMs)
  }

  // Kick off the first poll
  scheduleNext()

  // Return mutable state object so the orchestrator can read lastActivity
  const state: ClaudePollingState = {
    dispose() {
      disposed = true
      if (timerId !== null) {
        clearTimeout(timerId)
        timerId = null
      }
    },
    get lastActivity() {
      return lastClaudeActivity
    },
    get lastStatus() {
      return lastClaudeStatus
    },
  }

  return state
}
