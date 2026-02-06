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
import { ToastItemView, formatDuration } from './ToastItem'
import '../styles/Toast.css'

const MAX_VISIBLE = 3
const AUTO_DISMISS_MS = 5000
/** Commands longer than this also get a native macOS notification */
const NATIVE_NOTIFY_THRESHOLD_MS = 3000

export type ToastKind = 'command' | 'claude' | 'warning' | 'prd'

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
      if (toast.kind !== 'prd' && toast.projectId) {
        onFocusProject(toast.projectId)
      }
      dismissToast(toast.id)
    },
    [onFocusProject, dismissToast],
  )

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItemView
          key={toast.id}
          toast={toast}
          isDismissing={dismissing.has(toast.id)}
          onClick={handleClick}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  )
}

const MemoizedToastContainer = React.memo(ToastContainer)
export { MemoizedToastContainer as ToastContainer }
