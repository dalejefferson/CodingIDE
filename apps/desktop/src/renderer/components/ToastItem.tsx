import React from 'react'
import type { ToastItem, ToastKind } from './ToastContainer'

/* ── Toast icon SVGs ──────────────────────────────────────────── */

function ClaudeIcon() {
  return (
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
  )
}

function WarningIcon() {
  return (
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
  )
}

function PrdIcon() {
  return (
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
      <path d="M9 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5L9 1z" />
      <polyline points="9 1 9 5 13 5" />
      <polyline points="6 9 7.5 11 10 7" />
    </svg>
  )
}

function CheckIcon() {
  return (
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
  )
}

function CloseSmallIcon() {
  return (
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
  )
}

/* ── Helpers ──────────────────────────────────────────────────── */

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  return `${minutes}m ${remaining}s`
}

function getToastIconClass(kind: ToastKind): string {
  if (kind === 'claude') return ' toast-icon--claude'
  if (kind === 'warning') return ' toast-icon--warning'
  if (kind === 'prd') return ' toast-icon--prd'
  return ''
}

function getToastTitle(kind: ToastKind): string {
  if (kind === 'claude') return 'Claude finished'
  if (kind === 'warning') return 'Port conflict'
  if (kind === 'prd') return 'PRD ready'
  return 'Command completed'
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === 'claude') return <ClaudeIcon />
  if (kind === 'warning') return <WarningIcon />
  if (kind === 'prd') return <PrdIcon />
  return <CheckIcon />
}

/* ── ToastItemView ────────────────────────────────────────────── */

interface ToastItemViewProps {
  toast: ToastItem
  isDismissing: boolean
  onClick: (toast: ToastItem) => void
  onDismiss: (id: string) => void
}

export const ToastItemView = React.memo(function ToastItemView({
  toast,
  isDismissing,
  onClick,
  onDismiss,
}: ToastItemViewProps) {
  return (
    <div
      className={`toast-item${isDismissing ? ' toast-item--dismissing' : ''}`}
      onClick={() => onClick(toast)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick(toast)
      }}
    >
      <div className={`toast-icon${getToastIconClass(toast.kind)}`}>
        <ToastIcon kind={toast.kind} />
      </div>
      <div className="toast-content">
        <span className="toast-title">{getToastTitle(toast.kind)}</span>
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
          onDismiss(toast.id)
        }}
        aria-label="Dismiss"
      >
        <CloseSmallIcon />
      </button>
    </div>
  )
})
