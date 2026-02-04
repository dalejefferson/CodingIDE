import { useState, useCallback, useRef } from 'react'
import type { Ref } from 'react'
import type { Project } from '@shared/types'
import { TerminalGrid } from './TerminalGrid'
import type { TerminalGridHandle } from './TerminalGrid'
import { BrowserPane } from './BrowserPane'
import '../styles/ProjectWorkspace.css'

interface ProjectWorkspaceProps {
  project: Project
  palette: string
  gridRef?: Ref<TerminalGridHandle>
}

export default function ProjectWorkspace({ project, palette, gridRef }: ProjectWorkspaceProps) {
  const [browserOpen, setBrowserOpen] = useState(false)
  const [browserUrl, setBrowserUrl] = useState<string | undefined>(undefined)
  const [pickedPayload, setPickedPayload] = useState<string | null>(null)
  const [splitRatio, setSplitRatio] = useState(0.35)
  const panelsRef = useRef<HTMLDivElement>(null)

  const handlePickElement = useCallback((formatted: string) => {
    setPickedPayload(formatted)
  }, [])

  const handleDismissPayload = useCallback(() => {
    setPickedPayload(null)
  }, [])

  const handleLocalhostDetected = useCallback((url: string) => {
    setBrowserUrl(url)
    setBrowserOpen(true)
  }, [])

  const [isDragging, setIsDragging] = useState(false)

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const parent = panelsRef.current
    if (!parent) return

    setIsDragging(true)
    document.body.classList.add('is-resizing-h')
    const parentRect = parent.getBoundingClientRect()

    const onMouseMove = (ev: MouseEvent) => {
      const ratio = (ev.clientX - parentRect.left) / parentRect.width
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)))
    }

    const onMouseUp = () => {
      setIsDragging(false)
      document.body.classList.remove('is-resizing-h')
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  return (
    <div className="workspace">
      <div className="workspace-toggle-bar">
        <button
          type="button"
          className={`workspace-toggle-btn${browserOpen ? ' workspace-toggle-btn--active' : ''}`}
          onClick={() => setBrowserOpen((prev) => !prev)}
          title={browserOpen ? 'Hide browser' : 'Show browser'}
        >
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
            <circle cx="8" cy="8" r="6" />
            <path d="M2 8h12M8 2a10 10 0 014 6 10 10 0 01-4 6 10 10 0 01-4-6A10 10 0 018 2z" />
          </svg>
        </button>
      </div>

      <div
        ref={panelsRef}
        className={`workspace-panels${browserOpen ? ' workspace-panels--split' : ''}`}
      >
        <div
          className="workspace-terminal"
          style={browserOpen ? { flexBasis: `${splitRatio * 100}%`, flex: 'none' } : undefined}
        >
          <TerminalGrid
            ref={gridRef}
            projectId={project.id}
            cwd={project.path}
            palette={palette}
            onLocalhostDetected={handleLocalhostDetected}
          />
        </div>

        {browserOpen && (
          <>
            <div className="workspace-divider" onMouseDown={handleDividerMouseDown} />
            <div className="workspace-browser">
              <BrowserPane initialUrl={browserUrl} onPickElement={handlePickElement} />
              {isDragging && <div className="workspace-drag-overlay" />}
            </div>
          </>
        )}
      </div>

      {pickedPayload && (
        <div className="workspace-picked-toast">
          <pre className="workspace-picked-content">{pickedPayload}</pre>
          <div className="workspace-picked-actions">
            <button
              type="button"
              className="workspace-picked-btn workspace-picked-btn--copy"
              onClick={() => {
                navigator.clipboard.writeText(pickedPayload)
                setPickedPayload(null)
              }}
            >
              Copy
            </button>
            <button type="button" className="workspace-picked-btn" onClick={handleDismissPayload}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
