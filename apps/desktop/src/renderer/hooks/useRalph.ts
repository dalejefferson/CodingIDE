import { useState, useEffect, useCallback } from 'react'

// ── Types ───────────────────────────────────────────────────────

interface RalphState {
  running: boolean
  iteration: number
}

export interface UseRalphReturn {
  /** Check if Ralph is running for a specific ticket */
  isRunning: (ticketId: string) => boolean
  /** Get iteration count for a ticket */
  getIteration: (ticketId: string) => number
  /** All running ticket IDs */
  runningTicketIds: string[]
  /** Execute Ralph for a ticket, optionally providing a worktree base path */
  executeRalph: (ticketId: string, worktreeBasePath?: string) => Promise<void>
  /** Stop Ralph for a ticket */
  stopRalph: (ticketId: string) => Promise<void>
}

// ── Hook ────────────────────────────────────────────────────────

/**
 * Tracks Ralph Loop execution state per ticket.
 *
 * Listens for `ralph:status-changed` IPC broadcasts from the main
 * process and maintains a Map of running/iteration states. Completed
 * entries are cleaned up after 5 seconds to avoid unbounded growth.
 */
export function useRalph(): UseRalphReturn {
  const [states, setStates] = useState<Map<string, RalphState>>(new Map())

  // Listen for status broadcasts from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.ralph.onStatusChanged(
      (data: { ticketId: string; running: boolean; iteration: number }) => {
        setStates((prev) => {
          const next = new Map(prev)
          next.set(data.ticketId, {
            running: data.running,
            iteration: data.iteration,
          })
          // Clean up completed entries after a delay
          if (!data.running) {
            setTimeout(() => {
              setStates((current) => {
                const updated = new Map(current)
                const state = updated.get(data.ticketId)
                if (state && !state.running) {
                  updated.delete(data.ticketId)
                }
                return updated
              })
            }, 5000)
          }
          return next
        })
      },
    )
    return unsubscribe
  }, [])

  const isRunning = useCallback(
    (ticketId: string) => states.get(ticketId)?.running ?? false,
    [states],
  )

  const getIteration = useCallback(
    (ticketId: string) => states.get(ticketId)?.iteration ?? 0,
    [states],
  )

  const runningTicketIds = Array.from(states.entries())
    .filter(([, s]) => s.running)
    .map(([id]) => id)

  const executeRalph = useCallback(async (ticketId: string, worktreeBasePath?: string) => {
    await window.electronAPI.ralph.execute({ ticketId, worktreeBasePath })
  }, [])

  const stopRalph = useCallback(async (ticketId: string) => {
    await window.electronAPI.ralph.stop({ ticketId })
  }, [])

  return { isRunning, getIteration, runningTicketIds, executeRalph, stopRalph }
}
