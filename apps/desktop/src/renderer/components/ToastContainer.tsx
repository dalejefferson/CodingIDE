/**
 * ToastContainer — renders a stack of toast notifications.
 *
 * Positioned fixed at bottom-right. Toasts slide in from right,
 * auto-dismiss after a timeout, and can be clicked to trigger an action.
 * Max 3 visible at once; oldest is evicted when limit is reached.
 *
 * Handles two event types:
 *   - terminal:command-done — command completed in a background project
 *   - claude:done — Claude finished generating in a background project
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { CommandCompletionEvent } from '@shared/types'
import '../styles/Toast.css'

const MAX_VISIBLE = 3
const AUTO_DISMISS_MS = 5000
/** Commands longer than this also get a native macOS notification */
const NATIVE_NOTIFY_THRESHOLD_MS = 3000

export type ToastKind = 'command' | 'claude' | 'warning'

export interface ToastItem {
  id: string
  kind: ToastKind
  event: CommandCompletionEvent | null
  projectId: string
  projectName: string
  /** Optional custom message for warning toasts */
  message?: string
  /** Timestamp when toast was created */
  createdAt: number
}

interface ToastContainerProps {
  activeProjectId: string | null
  onFocusProject: (projectId: string) => void
}

function ToastContainer({ activeProjectId, onFocusProject }: ToastContainerProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [dismissing, setDismissing] = useState<Set<string>>(new Set())
  const nextId = useRef(0)
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const addToast = useCallback(
    (
      kind: ToastKind,
      projectId: string,
      projectName: string,
      event: CommandCompletionEvent | null,
    ) => {
      const id = `toast-${++nextId.current}`
      setToasts((prev) => {
        const next = [...prev, { id, kind, event, projectId, projectName, createdAt: Date.now() }]
        // Evict oldest if over limit
        if (next.length > MAX_VISIBLE) {
          return next.slice(next.length - MAX_VISIBLE)
        }
        return next
      })
    },
    [],
  )

  const dismissToast = useCallback((id: string) => {
    setDismissing((prev) => new Set(prev).add(id))
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      setDismissing((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 200)
  }, [])

  // Auto-dismiss: set timer once per toast when it first appears
  useEffect(() => {
    for (const toast of toasts) {
      if (timersRef.current.has(toast.id)) continue
      const remaining = AUTO_DISMISS_MS - (Date.now() - toast.createdAt)
      if (remaining <= 0) {
        dismissToast(toast.id)
        continue
      }
      timersRef.current.set(
        toast.id,
        setTimeout(() => {
          timersRef.current.delete(toast.id)
          dismissToast(toast.id)
        }, remaining),
      )
    }
    // Clean up timers for toasts that were removed externally
    for (const [id, timer] of timersRef.current) {
      if (!toasts.some((t) => t.id === id)) {
        clearTimeout(timer)
        timersRef.current.delete(id)
      }
    }
  }, [toasts, dismissToast])

  // Clean up all timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  // Listen for command completion events
  useEffect(() => {
    const unsubscribe = window.electronAPI.terminal.onCommandDone((event) => {
      // Only show toast if the completed command is NOT in the active project
      if (event.projectId === activeProjectId) return

      // Look up project name — use a generic fallback
      window.electronAPI.projects
        .getAll()
        .then((projects) => {
          const project = projects.find((p) => p.id === event.projectId)
          const name = project?.name ?? 'Terminal'
          addToast('command', event.projectId, name, event)

          // Fire native notification for long-running commands
          if (event.elapsedMs >= NATIVE_NOTIFY_THRESHOLD_MS) {
            window.electronAPI.notify
              .native({
                title: 'Command completed',
                body: `${name} — ${formatDuration(event.elapsedMs)}`,
              })
              .catch(() => {})
          }
        })
        .catch(() => {
          addToast('command', event.projectId, 'Terminal', event)
        })
    })
    return unsubscribe
  }, [activeProjectId, addToast])

  // Listen for Claude done events
  useEffect(() => {
    const unsubscribe = window.electronAPI.claude.onDone((event) => {
      // Only show toast if Claude finished in a NON-ACTIVE project
      if (event.projectId === activeProjectId) return

      window.electronAPI.projects
        .getAll()
        .then((projects) => {
          const project = projects.find((p) => p.id === event.projectId)
          const name = project?.name ?? 'Project'
          addToast('claude', event.projectId, name, null)

          // Always fire native notification for Claude completions
          window.electronAPI.notify
            .native({
              title: 'Claude finished',
              body: name,
            })
            .catch(() => {})
        })
        .catch(() => {
          addToast('claude', event.projectId, 'Project', null)
        })
    })
    return unsubscribe
  }, [activeProjectId, addToast])

  // Listen for custom toast events (e.g. port conflict warnings)
  useEffect(() => {
    const handler = (e: Event) => {
      const { kind, projectId, projectName, message } = (e as CustomEvent).detail as {
        kind: ToastKind
        projectId: string
        projectName: string
        message?: string
      }
      const id = `toast-${++nextId.current}`
      setToasts((prev) => {
        const next = [
          ...prev,
          { id, kind, event: null, projectId, projectName, message, createdAt: Date.now() },
        ]
        if (next.length > MAX_VISIBLE) return next.slice(next.length - MAX_VISIBLE)
        return next
      })
    }
    window.addEventListener('app:show-toast', handler)
    return () => window.removeEventListener('app:show-toast', handler)
  }, [])

  const handleClick = useCallback(
    (toast: ToastItem) => {
      onFocusProject(toast.projectId)
      dismissToast(toast.id)
    },
    [onFocusProject, dismissToast],
  )

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item${dismissing.has(toast.id) ? ' toast-item--dismissing' : ''}`}
          onClick={() => handleClick(toast)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleClick(toast)
          }}
        >
          <div
            className={`toast-icon${toast.kind === 'claude' ? ' toast-icon--claude' : ''}${toast.kind === 'warning' ? ' toast-icon--warning' : ''}`}
          >
            {toast.kind === 'claude' ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 1v4M8 11v4M1 8h4M11 8h4M3 3l2.5 2.5M10.5 10.5L13 13M13 3l-2.5 2.5M5.5 10.5L3 13" />
              </svg>
            ) : toast.kind === 'warning' ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 1L1 14h14L8 1z" />
                <path d="M8 6v4M8 12h.01" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="2 8 6 12 14 4" />
              </svg>
            )}
          </div>
          <div className="toast-content">
            <span className="toast-title">
              {toast.kind === 'claude'
                ? 'Claude finished'
                : toast.kind === 'warning'
                  ? 'Port conflict'
                  : 'Command completed'}
            </span>
            <span className="toast-detail">
              {toast.message ?? toast.projectName}
              {toast.event ? ` \u00B7 ${formatDuration(toast.event.elapsedMs)}` : ''}
            </span>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation()
              dismissToast(toast.id)
            }}
            aria-label="Dismiss"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M4 4L12 12M12 4L4 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

const MemoizedToastContainer = React.memo(ToastContainer)
export { MemoizedToastContainer as ToastContainer }

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  return `${minutes}m ${remaining}s`
}
