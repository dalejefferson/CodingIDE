/**
 * ToastContainer — renders a stack of toast notifications.
 *
 * Positioned fixed at bottom-right. Toasts slide in from right,
 * auto-dismiss after a timeout, and can be clicked to trigger an action.
 * Max 3 visible at once; oldest is evicted when limit is reached.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { CommandCompletionEvent } from '@shared/types'
import '../styles/Toast.css'

const MAX_VISIBLE = 3
const AUTO_DISMISS_MS = 5000
/** Commands longer than this also get a native macOS notification */
const NATIVE_NOTIFY_THRESHOLD_MS = 3000

export interface ToastItem {
  id: string
  event: CommandCompletionEvent
  projectName: string
  /** Timestamp when toast was created */
  createdAt: number
}

interface ToastContainerProps {
  activeProjectId: string | null
  onFocusProject: (projectId: string) => void
}

export function ToastContainer({ activeProjectId, onFocusProject }: ToastContainerProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [dismissing, setDismissing] = useState<Set<string>>(new Set())
  const nextId = useRef(0)

  const addToast = useCallback((event: CommandCompletionEvent, projectName: string) => {
    const id = `toast-${++nextId.current}`
    setToasts((prev) => {
      const next = [...prev, { id, event, projectName, createdAt: Date.now() }]
      // Evict oldest if over limit
      if (next.length > MAX_VISIBLE) {
        return next.slice(next.length - MAX_VISIBLE)
      }
      return next
    })
  }, [])

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

  // Auto-dismiss timer
  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((toast) => {
      const remaining = AUTO_DISMISS_MS - (Date.now() - toast.createdAt)
      if (remaining <= 0) {
        dismissToast(toast.id)
        return undefined
      }
      return setTimeout(() => dismissToast(toast.id), remaining)
    })
    return () => {
      for (const t of timers) {
        if (t !== undefined) clearTimeout(t)
      }
    }
  }, [toasts, dismissToast])

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
          addToast(event, name)

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
          addToast(event, 'Terminal')
        })
    })
    return unsubscribe
  }, [activeProjectId, addToast])

  const handleClick = useCallback(
    (toast: ToastItem) => {
      onFocusProject(toast.event.projectId)
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
          <div className="toast-icon">
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
          </div>
          <div className="toast-content">
            <span className="toast-title">Command completed</span>
            <span className="toast-detail">
              {toast.projectName} &middot; {formatDuration(toast.event.elapsedMs)}
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  return `${minutes}m ${remaining}s`
}
