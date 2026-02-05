import { useState, useEffect, useRef } from 'react'
import { QRCodeDisplay } from './QRCodeDisplay'
import type { MobileApp, ExpoStatusResponse } from '@shared/types'

interface AppDetailPanelProps {
  app: MobileApp
  onStart: (appId: string) => Promise<void>
  onStop: (appId: string) => Promise<void>
  onOpenAsProject: (appId: string) => Promise<void>
}

export function AppDetailPanel({ app, onStart, onStop, onOpenAsProject }: AppDetailPanelProps) {
  const [log, setLog] = useState('')
  const [actionPending, setActionPending] = useState(false)
  const logRef = useRef<HTMLPreElement>(null)

  // Poll status for log updates when running/starting
  useEffect(() => {
    if (app.status !== 'running' && app.status !== 'starting') return

    let cancelled = false
    const poll = async () => {
      try {
        const status: ExpoStatusResponse = await window.electronAPI.expo.getStatus({
          appId: app.id,
        })
        if (!cancelled) setLog(status.log)
      } catch {
        // Ignore polling errors
      }
    }
    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [app.id, app.status])

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [log])

  const handleStart = async () => {
    setActionPending(true)
    try {
      await onStart(app.id)
    } finally {
      setActionPending(false)
    }
  }

  const handleStop = async () => {
    setActionPending(true)
    try {
      await onStop(app.id)
    } finally {
      setActionPending(false)
    }
  }

  const canStart = app.status === 'idle' || app.status === 'stopped' || app.status === 'error'
  const canStop = app.status === 'running' || app.status === 'starting'

  return (
    <div className="app-detail">
      <h2 className="app-detail__name">{app.name}</h2>

      <div className="app-detail__meta">
        <div className="app-detail__meta-row">
          <span className="app-detail__meta-label">Path</span>
          <span className="app-detail__meta-value" title={app.path}>
            {app.path}
          </span>
        </div>
        <div className="app-detail__meta-row">
          <span className="app-detail__meta-label">Template</span>
          <span className="app-detail__meta-value">{app.template}</span>
        </div>
        <div className="app-detail__meta-row">
          <span className="app-detail__meta-label">Port</span>
          <span className="app-detail__meta-value">{app.metroPort}</span>
        </div>
        <div className="app-detail__meta-row">
          <span className="app-detail__meta-label">Status</span>
          <span className="app-detail__meta-value">{app.status}</span>
        </div>
      </div>

      <div className="app-detail__actions">
        {canStart && (
          <button
            type="button"
            className="app-builder__btn app-builder__btn--primary"
            onClick={handleStart}
            disabled={actionPending}
          >
            {actionPending ? 'Starting...' : 'Start'}
          </button>
        )}
        {canStop && (
          <button
            type="button"
            className="app-builder__btn app-builder__btn--secondary"
            onClick={handleStop}
            disabled={actionPending}
          >
            {actionPending ? 'Stopping...' : 'Stop'}
          </button>
        )}
        <button
          type="button"
          className="app-builder__btn app-builder__btn--secondary"
          onClick={() => onOpenAsProject(app.id)}
        >
          Open in Workspace
        </button>
      </div>

      {app.status === 'running' && app.expoUrl && <QRCodeDisplay expoUrl={app.expoUrl} />}

      {app.lastError && <div className="app-detail__error">{app.lastError}</div>}

      {log && (
        <pre ref={logRef} className="app-detail__log">
          {log}
        </pre>
      )}
    </div>
  )
}
