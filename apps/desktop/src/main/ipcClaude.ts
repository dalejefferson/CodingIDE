/**
 * Claude Activity Polling
 *
 * Polls terminal buffers every 5 seconds for Claude activity indicators,
 * detects status transitions (idle → running → done), and broadcasts
 * changes to the renderer. Uses shallow-equality diffing to suppress
 * redundant IPC (~95% reduction in steady state).
 */

import { shallowEqual, sendToRenderer, broadcastStatusChange } from './ipcHelpers'
import type { TerminalService } from '@services/terminalService'
import type { ProjectStore } from '@services/projectStore'

export interface ClaudePollingState {
  interval: ReturnType<typeof setInterval>
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

  const interval = setInterval(async () => {
    // Early exit: skip poll if no terminals exist
    if (!terminalService.hasAny()) {
      // Clear stale data if terminals were destroyed
      if (Object.keys(lastClaudeActivity).length > 0) {
        lastClaudeActivity = {}
        lastClaudeStatus = {}
        sendToRendererFn('claude:activity', {})
        sendToRendererFn('claude:status', {})
      }
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
  }, 5000)

  // Return mutable state object so the orchestrator can read lastActivity
  const state: ClaudePollingState = {
    interval,
    get lastActivity() {
      return lastClaudeActivity
    },
    get lastStatus() {
      return lastClaudeStatus
    },
  }

  return state
}
