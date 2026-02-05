import { useState, useEffect, useCallback, useRef } from 'react'
import type { Project, MobileApp, ExpoStatusResponse, FileEntry } from '@shared/types'
import { IPhoneFrame } from './IPhoneFrame'
import '../../styles/MobileWorkspace.css'

interface MobileWorkspaceProps {
  project: Project
  app: MobileApp | null
  isVisible: boolean
  onStartApp: (appId: string) => Promise<void>
  onStopApp: (appId: string) => Promise<void>
}

/** Polling interval for checking Metro / Expo status while starting */
const STATUS_POLL_MS = 2000

export function MobileWorkspace({ project, app, isVisible, onStartApp }: MobileWorkspaceProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [webUrl, setWebUrl] = useState<string | null>(app?.webUrl ?? null)
  const [isStarting, setIsStarting] = useState(false)
  const autoStartedRef = useRef(false)

  // ── Load file tree ──────────────────────────────────────────
  useEffect(() => {
    if (!project.id) return
    let cancelled = false
    const loadFiles = async () => {
      try {
        const entries = await window.electronAPI.fileOps.listDir({
          projectId: project.id,
          dirPath: '',
        })
        if (!cancelled) setFiles(entries)
      } catch (err) {
        console.error('[MobileWorkspace] Failed to list files:', err)
      }
    }
    loadFiles()
    return () => {
      cancelled = true
    }
  }, [project.id])

  // ── Auto-start app if not running ───────────────────────────
  useEffect(() => {
    if (!app) return
    if (autoStartedRef.current) return
    const canStart = app.status === 'idle' || app.status === 'stopped' || app.status === 'error'
    if (canStart) {
      autoStartedRef.current = true
      setIsStarting(true)
      onStartApp(app.id).catch((err) => {
        console.error('[MobileWorkspace] Auto-start failed:', err)
        setIsStarting(false)
      })
    }
  }, [app, onStartApp])

  // ── Poll status to get webUrl while starting ────────────────
  useEffect(() => {
    if (!app) return
    if (app.status !== 'starting' && app.status !== 'running') return

    let cancelled = false
    const poll = async () => {
      try {
        const status: ExpoStatusResponse = await window.electronAPI.expo.getStatus({
          appId: app.id,
        })
        if (cancelled) return
        if (status.webUrl) {
          setWebUrl(status.webUrl)
          setIsStarting(false)
        }
        if (status.status === 'running') {
          setIsStarting(false)
        }
      } catch {
        // Ignore polling errors
      }
    }
    poll()
    const interval = setInterval(poll, STATUS_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [app?.id, app?.status])

  // ── Sync webUrl from app prop ───────────────────────────────
  useEffect(() => {
    if (app?.webUrl) setWebUrl(app.webUrl)
  }, [app?.webUrl])

  const handleSelectFile = useCallback((name: string) => {
    setSelectedFile(name)
  }, [])

  return (
    <div className={`mobile-workspace${!isVisible ? ' mobile-workspace--hidden' : ''}`}>
      {/* Left panel — File tree */}
      <div className="mobile-workspace__files">
        <div className="mobile-workspace__files-header">Files</div>
        <div className="mobile-workspace__files-list">
          {files.map((entry) => (
            <div
              key={entry.name}
              className={`mobile-workspace__file-entry${
                selectedFile === entry.name ? ' mobile-workspace__file-entry--selected' : ''
              }${entry.isDir ? ' mobile-workspace__file-entry--dir' : ''}`}
              onClick={() => handleSelectFile(entry.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelectFile(entry.name)
                }
              }}
            >
              <span className="mobile-workspace__file-icon">
                {entry.isDir ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" opacity="0.6">
                    <path d="M1 3.5A1.5 1.5 0 012.5 2h3.379a1.5 1.5 0 011.06.44l.94.94a.5.5 0 00.354.146H13.5A1.5 1.5 0 0115 5v7.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    opacity="0.6"
                  >
                    <path d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" />
                    <path d="M9 1v4h4" />
                  </svg>
                )}
              </span>
              <span className="mobile-workspace__file-name">{entry.name}</span>
            </div>
          ))}
          {files.length === 0 && <div className="mobile-workspace__files-empty">No files</div>}
        </div>
      </div>

      {/* Middle panel — Code editor placeholder */}
      <div className="mobile-workspace__editor">
        {selectedFile ? (
          <div className="mobile-workspace__editor-file">{selectedFile}</div>
        ) : (
          <div className="mobile-workspace__editor-placeholder">Select a file to edit</div>
        )}
      </div>

      {/* Right panel — iPhone preview */}
      <div className="mobile-workspace__preview">
        {isStarting && !webUrl ? (
          <div className="mobile-workspace__preview-loading">
            <div className="mobile-workspace__preview-skeleton" />
            <span className="mobile-workspace__preview-loading-text">Starting Metro...</span>
          </div>
        ) : (
          <IPhoneFrame webUrl={webUrl} />
        )}
      </div>
    </div>
  )
}
