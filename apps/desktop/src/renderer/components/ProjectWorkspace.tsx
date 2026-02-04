import { useState, useCallback, useRef, useEffect } from 'react'
import type { Ref } from 'react'
import type { Project, BrowserViewMode } from '@shared/types'
import { TerminalGrid } from './TerminalGrid'
import type { TerminalGridHandle } from './TerminalGrid'
import { BrowserPane } from './BrowserPane'
import '../styles/ProjectWorkspace.css'

interface PickedChange {
  element: string
  instruction: string
}

interface ProjectWorkspaceProps {
  project: Project
  palette: string
  gridRef?: Ref<TerminalGridHandle>
}

export default function ProjectWorkspace({ project, palette, gridRef }: ProjectWorkspaceProps) {
  const [viewMode, setViewMode] = useState<BrowserViewMode>('closed')
  const [browserUrl, setBrowserUrl] = useState<string | undefined>(undefined)
  const [splitRatio, setSplitRatio] = useState(0.35)
  const [isDragging, setIsDragging] = useState(false)
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null)
  const panelsRef = useRef<HTMLDivElement>(null)
  const previousModeRef = useRef<BrowserViewMode>('split')

  // Change-chaining state
  const [pickedChanges, setPickedChanges] = useState<PickedChange[]>([])
  const [pendingPick, setPendingPick] = useState<string | null>(null)
  const [changeInput, setChangeInput] = useState('')
  const changeInputRef = useRef<HTMLInputElement>(null)

  const browserVisible = viewMode !== 'closed'
  const showSplitBrowser = viewMode === 'split' || viewMode === 'focused'

  const handlePickElement = useCallback((formatted: string) => {
    setPendingPick(formatted)
    setChangeInput('')
  }, [])

  // Focus the input when a new element is picked
  useEffect(() => {
    if (pendingPick) changeInputRef.current?.focus()
  }, [pendingPick])

  const handleSubmitChange = useCallback(() => {
    if (!pendingPick || !changeInput.trim()) return
    setPickedChanges((prev) => [...prev, { element: pendingPick, instruction: changeInput.trim() }])
    setPendingPick(null)
    setChangeInput('')
  }, [pendingPick, changeInput])

  const handleRemoveChange = useCallback((index: number) => {
    setPickedChanges((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSendToClaude = useCallback(() => {
    if (pickedChanges.length === 0) return
    const lines = ['Make the following UI changes:']
    pickedChanges.forEach((change, i) => {
      lines.push('')
      lines.push(`${i + 1}. ${change.element.split('\n')[0]}`)
      lines.push(`   Change: ${change.instruction}`)
    })
    const prompt = lines.join('\n')
    const escaped = prompt.replace(/'/g, "'\\''")
    window.dispatchEvent(new CustomEvent('terminal:run-command', { detail: `cc '${escaped}'` }))
    setPickedChanges([])
    setPendingPick(null)
    setChangeInput('')
  }, [pickedChanges])

  const handleClearChanges = useCallback(() => {
    setPickedChanges([])
    setPendingPick(null)
    setChangeInput('')
  }, [])

  const handleLocalhostDetected = useCallback((url: string) => {
    setBrowserUrl(url)
    setViewMode('focused')
    window.dispatchEvent(new Event('sidebar:collapse'))
  }, [])

  const handleChangeViewMode = useCallback((mode: BrowserViewMode) => {
    setViewMode((prev) => {
      if (mode !== 'closed') {
        previousModeRef.current = prev === 'closed' ? 'split' : prev
      }
      return mode
    })
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent).detail as BrowserViewMode
      setViewMode((prev) => {
        if (mode === 'focused' && prev === 'focused') return 'split'
        previousModeRef.current = prev === 'closed' ? 'split' : prev
        return mode
      })
    }
    window.addEventListener('browser:set-view-mode', handler)
    return () => window.removeEventListener('browser:set-view-mode', handler)
  }, [])

  useEffect(() => {
    if (viewMode !== 'fullscreen' && viewMode !== 'pip') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setViewMode(previousModeRef.current)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [viewMode])

  useEffect(() => {
    if (viewMode === 'split' || viewMode === 'closed') {
      const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
      return () => clearTimeout(t)
    }
  }, [viewMode])

  useEffect(() => {
    if (viewMode === 'pip') {
      setPipPos({ x: window.innerWidth - 416, y: window.innerHeight - 316 })
    }
  }, [viewMode])

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

  const handlePipDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!pipPos) return
      e.preventDefault()
      const startX = e.clientX - pipPos.x
      const startY = e.clientY - pipPos.y
      const onMouseMove = (ev: MouseEvent) => {
        const x = Math.max(-350, Math.min(window.innerWidth - 50, ev.clientX - startX))
        const y = Math.max(0, Math.min(window.innerHeight - 50, ev.clientY - startY))
        setPipPos({ x, y })
      }
      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [pipPos],
  )

  const toggleBrowser = useCallback(() => {
    setViewMode((prev) => {
      if (prev === 'closed') {
        window.dispatchEvent(new Event('sidebar:collapse'))
        return 'split'
      }
      return 'closed'
    })
  }, [])

  const terminalStyle =
    viewMode === 'split'
      ? { flexBasis: `${splitRatio * 100}%`, flex: 'none' as const }
      : viewMode === 'focused'
        ? { flexBasis: '28px', flex: 'none' as const, overflow: 'hidden' as const }
        : undefined

  const browserPane = (
    <BrowserPane
      initialUrl={browserUrl}
      onPickElement={handlePickElement}
      viewMode={viewMode}
      onChangeViewMode={handleChangeViewMode}
    />
  )

  return (
    <div className="workspace">
      <div className="workspace-toggle-bar">
        <button
          type="button"
          className={`workspace-toggle-btn${browserVisible ? ' workspace-toggle-btn--active' : ''}`}
          onClick={toggleBrowser}
          title={browserVisible ? 'Hide browser' : 'Show browser'}
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
        className={`workspace-panels${showSplitBrowser ? ' workspace-panels--split' : ''}`}
      >
        <div
          className={`workspace-terminal${viewMode === 'focused' ? ' workspace-terminal--collapsed' : ''}`}
          style={terminalStyle}
        >
          {viewMode === 'focused' ? (
            <div
              className="workspace-collapsed-bar"
              onClick={() => setViewMode('split')}
              title="Expand terminal"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 3l5 5-5 5" />
              </svg>
              Terminal
            </div>
          ) : (
            <TerminalGrid
              ref={gridRef}
              projectId={project.id}
              cwd={project.path}
              palette={palette}
              onLocalhostDetected={handleLocalhostDetected}
            />
          )}
        </div>

        {showSplitBrowser && (
          <>
            <div className="workspace-divider" onMouseDown={handleDividerMouseDown} />
            <div className="workspace-browser">
              {browserPane}
              {isDragging && <div className="workspace-drag-overlay" />}
            </div>
          </>
        )}
      </div>

      {viewMode === 'fullscreen' && <div className="browser-fullscreen-overlay">{browserPane}</div>}

      {viewMode === 'pip' && pipPos && (
        <div
          className="browser-pip-container"
          style={{ left: pipPos.x, top: pipPos.y }}
          onMouseDown={handlePipDragStart}
        >
          {browserPane}
        </div>
      )}

      {/* Change input prompt — shown when an element was just picked */}
      {pendingPick && (
        <div className="workspace-change-prompt">
          <pre className="workspace-change-element">{pendingPick.split('\n')[0]}</pre>
          <input
            ref={changeInputRef}
            className="workspace-change-input"
            value={changeInput}
            onChange={(e) => setChangeInput(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter' && changeInput.trim()) handleSubmitChange()
              if (e.key === 'Escape') setPendingPick(null)
            }}
            placeholder="What change do you want to make?"
          />
          <div className="workspace-change-actions">
            <button
              type="button"
              className="workspace-change-btn workspace-change-btn--primary"
              onClick={handleSubmitChange}
              disabled={!changeInput.trim()}
            >
              Add
            </button>
            <button
              type="button"
              className="workspace-change-btn"
              onClick={() => setPendingPick(null)}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Queued changes list */}
      {pickedChanges.length > 0 && !pendingPick && (
        <div className="workspace-change-list">
          <div className="workspace-change-list-header">
            {pickedChanges.length} change{pickedChanges.length > 1 ? 's' : ''} queued
          </div>
          {pickedChanges.map((change, i) => (
            <div key={i} className="workspace-change-item">
              <span className="workspace-change-number">{i + 1}</span>
              <span className="workspace-change-instruction">{change.instruction}</span>
              <button
                type="button"
                className="workspace-change-remove"
                onClick={() => handleRemoveChange(i)}
              >
                &times;
              </button>
            </div>
          ))}
          <div className="workspace-change-list-actions">
            <button
              type="button"
              className="workspace-change-btn workspace-change-btn--send"
              onClick={handleSendToClaude}
            >
              Send to Claude
            </button>
            <button type="button" className="workspace-change-btn" onClick={handleClearChanges}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
