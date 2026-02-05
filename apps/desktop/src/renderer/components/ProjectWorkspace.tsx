import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { Ref } from 'react'
import type { Project, BrowserViewMode } from '@shared/types'
import { TerminalGrid } from './TerminalGrid'
import type { TerminalGridHandle } from './TerminalGrid'
import { BrowserPane } from './BrowserPane'
import { InlineTerminalDrawer } from './InlineTerminalDrawer'
import { CreateFileModal, EditFileModal } from './FileOpsModals'
import { FileTree } from './FileTree'
import type { FileTreeHandle } from './FileTree'
import { CodeViewer } from './CodeViewer'
import '../styles/ProjectWorkspace.css'

interface PickedChange {
  element: string
  instruction: string
}

interface ProjectWorkspaceProps {
  project: Project
  palette: string
  gridRef?: Ref<TerminalGridHandle>
  isVisible?: boolean
  /** Check if a port is already in use by another project. Returns the owning project ID or null. */
  getPortOwner?: (port: number) => string | null
  /** Register that this project is using a port. */
  registerPort?: (projectId: string, port: number) => void
  /** Unregister a port when no longer in use. */
  unregisterPort?: (projectId: string, port: number) => void
}

/** Extract the port number from a localhost URL, or null if not a localhost URL */
function extractLocalhostPort(url: string | undefined): number | null {
  if (!url) return null
  const match = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

function ProjectWorkspace({
  project,
  palette,
  gridRef,
  isVisible = true,
  getPortOwner,
  registerPort,
  unregisterPort,
}: ProjectWorkspaceProps) {
  // Restore persisted browser state from the project, or default to closed/undefined.
  // Only restore split/focused if there's actually a URL to show — otherwise the browser
  // pane opens to a blank white page and wastes screen space.
  const [viewMode, setViewMode] = useState<BrowserViewMode>(() => {
    const persisted = project.browserViewMode
    if (!persisted || persisted === 'closed') return 'closed'
    if (!project.browserUrl) return 'closed'
    return persisted
  })
  const [browserUrl, setBrowserUrl] = useState<string | undefined>(project.browserUrl ?? undefined)
  const [splitRatio, setSplitRatio] = useState(0.35)
  const [isDragging, setIsDragging] = useState(false)
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null)
  const [pipSize, setPipSize] = useState<{ w: number; h: number }>({ w: 400, h: 300 })
  const panelsRef = useRef<HTMLDivElement>(null)
  const previousModeRef = useRef<BrowserViewMode>('split')

  // Inline terminal drawer state (toggled per-pane terminal)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), [])

  // File explorer state
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const fileTreeRef = useRef<FileTreeHandle>(null)

  const handleToggleExplorer = useCallback(() => {
    setExplorerOpen((prev) => !prev)
  }, [])

  const handleSelectFile = useCallback((relPath: string) => {
    setSelectedFile(relPath)
  }, [])

  const handleCloseFile = useCallback(() => {
    setSelectedFile(null)
  }, [])

  // File ops modal state
  const [showCreateFile, setShowCreateFile] = useState(false)
  const [showEditFile, setShowEditFile] = useState(false)

  // Change-chaining state
  const [pickedChanges, setPickedChanges] = useState<PickedChange[]>([])
  const [pendingPick, setPendingPick] = useState<string | null>(null)
  const [changeInput, setChangeInput] = useState('')
  const changeInputRef = useRef<HTMLInputElement>(null)

  // Track which port this project is using and register/deregister on change
  const lastPortRef = useRef<number | null>(extractLocalhostPort(browserUrl))
  useEffect(() => {
    const newPort = extractLocalhostPort(browserUrl)
    const oldPort = lastPortRef.current

    if (oldPort !== newPort) {
      if (oldPort !== null) unregisterPort?.(project.id, oldPort)
      if (newPort !== null) registerPort?.(project.id, newPort)
      lastPortRef.current = newPort
    }

    return () => {
      // Cleanup on unmount
      const port = lastPortRef.current
      if (port !== null) unregisterPort?.(project.id, port)
    }
  }, [browserUrl, project.id, registerPort, unregisterPort])

  // Persist browser URL to disk when it changes (debounced to avoid write spam)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      window.electronAPI.browser
        .setProjectBrowser({
          id: project.id,
          browserUrl: browserUrl ?? null,
          browserViewMode: viewMode,
        })
        .catch(() => {})
    }, 500)
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    }
  }, [browserUrl, viewMode, project.id])

  const browserVisible = viewMode !== 'closed'
  const showSplitBrowser = viewMode === 'split' || viewMode === 'focused'
  // Track whether the browser has ever been opened so we can keep the webview
  // mounted after the first open (avoids expensive re-init on every toggle).
  const [browserEverOpened, setBrowserEverOpened] = useState(browserVisible)
  useEffect(() => {
    if (browserVisible && !browserEverOpened) setBrowserEverOpened(true)
  }, [browserVisible, browserEverOpened])

  const handleBrowserUrlChange = useCallback((url: string) => {
    setBrowserUrl(url)
  }, [])

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
    const lines = ['Use /task to make the following UI changes in parallel:']
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

  const handleLocalhostDetected = useCallback(
    (url: string) => {
      // Check if another project already owns this port
      const port = extractLocalhostPort(url)
      if (port !== null && getPortOwner) {
        const owner = getPortOwner(port)
        if (owner !== null && owner !== project.id) {
          // Port is used by another project — notify user instead of silently ignoring
          window.dispatchEvent(
            new CustomEvent('app:show-toast', {
              detail: {
                kind: 'warning',
                projectId: project.id,
                projectName: project.name,
                message: `Port ${port} is already in use by another project`,
              },
            }),
          )
          return
        }
      }
      setBrowserUrl(url)
      setViewMode('focused')
      window.dispatchEvent(new Event('sidebar:collapse'))
    },
    [getPortOwner, project.id, project.name],
  )

  const handleChangeViewMode = useCallback((mode: BrowserViewMode) => {
    setViewMode((prev) => {
      if (mode !== 'closed') {
        previousModeRef.current = prev === 'closed' ? 'split' : prev
      }
      return mode
    })
  }, [])

  const toggleBrowser = useCallback(() => {
    setViewMode((prev) => {
      if (prev === 'closed') {
        window.dispatchEvent(new Event('sidebar:collapse'))
        return 'split'
      }
      return 'closed'
    })
  }, [])

  // Only listen for browser events when this workspace is visible.
  // Hidden workspaces don't need to respond to global browser events.
  useEffect(() => {
    if (!isVisible) return
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
  }, [isVisible])

  // Navigate the embedded browser when a localhost link is clicked in the terminal
  useEffect(() => {
    if (!isVisible) return
    const handler = (e: Event) => {
      const url = (e as CustomEvent).detail as string
      setBrowserUrl(url)
      setViewMode((prev) => {
        if (prev === 'closed') {
          window.dispatchEvent(new Event('sidebar:collapse'))
          return 'split'
        }
        return prev
      })
    }
    window.addEventListener('browser:navigate', handler)
    return () => window.removeEventListener('browser:navigate', handler)
  }, [isVisible])

  // Consolidated keyboard handler — single listener instead of 4 separate ones.
  // Skips all shortcuts when the workspace is hidden.
  useEffect(() => {
    if (!isVisible) return
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Escape: exit fullscreen/pip
      if (e.key === 'Escape' && (viewMode === 'fullscreen' || viewMode === 'pip')) {
        e.preventDefault()
        e.stopPropagation()
        setViewMode(previousModeRef.current)
        return
      }

      if (!mod || e.shiftKey) return

      // Cmd+G: toggle browser
      if (e.key === 'g') {
        e.preventDefault()
        e.stopPropagation()
        toggleBrowser()
        return
      }

      // Cmd+`: toggle inline terminal drawer
      if (e.key === '`') {
        e.preventDefault()
        e.stopPropagation()
        toggleDrawer()
        return
      }

      // Cmd+E: toggle file explorer
      if (e.key === 'e') {
        e.preventDefault()
        handleToggleExplorer()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isVisible, viewMode, toggleBrowser, toggleDrawer, handleToggleExplorer])

  useEffect(() => {
    if (viewMode === 'split' || viewMode === 'closed') {
      const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
      return () => clearTimeout(t)
    }
  }, [viewMode])

  useEffect(() => {
    if (viewMode === 'pip') {
      setPipPos({ x: window.innerWidth - pipSize.w - 16, y: window.innerHeight - pipSize.h - 16 })
    }
  }, [viewMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fire resize when becoming visible so terminals + browser recalculate dimensions
  useEffect(() => {
    if (isVisible) {
      const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
      return () => clearTimeout(t)
    }
  }, [isVisible])

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const parent = panelsRef.current
    if (!parent) return
    setIsDragging(true)
    document.body.classList.add('is-resizing-h')
    const parentRect = parent.getBoundingClientRect()
    const onMouseMove = (ev: MouseEvent) => {
      const ratio = (ev.clientX - parentRect.left) / parentRect.width
      setSplitRatio(Math.max(0.05, Math.min(0.95, ratio)))
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

  const PIP_MIN_W = 280
  const PIP_MIN_H = 200
  const PIP_MAX_W = 1200
  const PIP_MAX_H = 900

  const handlePipResizeStart = useCallback(
    (e: React.MouseEvent, edge: string) => {
      if (!pipPos) return
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const startW = pipSize.w
      const startH = pipSize.h
      const startPosX = pipPos.x
      const startPosY = pipPos.y

      const onMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        let newW = startW
        let newH = startH
        let newX = startPosX
        let newY = startPosY

        if (edge.includes('e')) newW = Math.max(PIP_MIN_W, Math.min(PIP_MAX_W, startW + dx))
        if (edge.includes('s')) newH = Math.max(PIP_MIN_H, Math.min(PIP_MAX_H, startH + dy))
        if (edge.includes('w')) {
          const proposedW = startW - dx
          newW = Math.max(PIP_MIN_W, Math.min(PIP_MAX_W, proposedW))
          newX = startPosX + (startW - newW)
        }
        if (edge.includes('n')) {
          const proposedH = startH - dy
          newH = Math.max(PIP_MIN_H, Math.min(PIP_MAX_H, proposedH))
          newY = startPosY + (startH - newH)
        }

        setPipSize({ w: newW, h: newH })
        setPipPos({ x: newX, y: newY })
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [pipPos, pipSize],
  )

  // Use individual flex properties instead of the `flex` shorthand to avoid
  // the shorthand resetting `flex-basis` when applied after it in inline styles.
  // In 'closed' mode, omit inline flex so the CSS `flex: 1` rule fills the space.
  const terminalStyle =
    viewMode === 'split'
      ? { flexGrow: 0, flexShrink: 0, flexBasis: `${splitRatio * 100}%` }
      : viewMode === 'focused'
        ? { flexGrow: 0, flexShrink: 0, flexBasis: '28px', overflow: 'hidden' as const }
        : {}

  const browserPane = (
    <BrowserPane
      initialUrl={browserUrl}
      projectId={project.id}
      onPickElement={handlePickElement}
      onUrlChange={handleBrowserUrlChange}
      viewMode={viewMode}
      onChangeViewMode={handleChangeViewMode}
    />
  )

  return (
    <div className={`workspace${isVisible ? '' : ' workspace--hidden'}`}>
      <div className="workspace-toggle-bar">
        <button
          type="button"
          className={`workspace-toggle-btn${explorerOpen ? ' workspace-toggle-btn--active' : ''}`}
          onClick={handleToggleExplorer}
          title="Toggle file explorer (Cmd+E)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 2h4.5l1.5 2H14v10H2V2z" />
            <path d="M2 6h12" />
          </svg>
        </button>
        <button
          type="button"
          className="workspace-toggle-btn"
          onClick={() => setShowCreateFile(true)}
          title="Create file (File Ops)"
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
            <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6l-4-4z" />
            <path d="M9 2v4h4" />
            <path d="M8 9v3M6.5 10.5h3" />
          </svg>
        </button>
        <button
          type="button"
          className="workspace-toggle-btn"
          onClick={() => setShowEditFile(true)}
          title="Edit file (File Ops)"
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
            <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
          </svg>
        </button>
        <button
          type="button"
          className={`workspace-toggle-btn${drawerOpen ? ' workspace-toggle-btn--active' : ''}`}
          onClick={toggleDrawer}
          title={drawerOpen ? 'Hide terminal drawer (Cmd+`)' : 'Show terminal drawer (Cmd+`)'}
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
            <rect x="2" y="2" width="12" height="12" rx="1.5" />
            <path d="M2 10h12" />
            <path d="M5 12.5l1.5-1.5L5 9.5" />
          </svg>
        </button>
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
        className={`workspace-panels${browserEverOpened ? ' workspace-panels--split' : ''}`}
      >
        {explorerOpen && (
          <div className="workspace-explorer">
            <div className="workspace-explorer-tree">
              <div className="workspace-explorer-tree-header">
                <span className="workspace-explorer-tree-title">Explorer</span>
                <div className="workspace-explorer-actions">
                  {/* New File */}
                  <button
                    className="workspace-explorer-action"
                    onClick={() => setShowCreateFile(true)}
                    title="New File"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5l-3.5-3.5z" />
                      <path d="M9.5 1.5V5H13" />
                      <path d="M8 8v4M6 10h4" />
                    </svg>
                  </button>
                  {/* New Folder */}
                  <button
                    className="workspace-explorer-action"
                    onClick={() => {
                      setShowCreateFile(true)
                    }}
                    title="New Folder"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1.5 4h4.5l1.5-2h5a1 1 0 011 1v8a1 1 0 01-1 1h-10a1 1 0 01-1-1V4z" />
                      <path d="M8 6.5v4M6 8.5h4" />
                    </svg>
                  </button>
                  {/* Refresh */}
                  <button
                    className="workspace-explorer-action"
                    onClick={() => fileTreeRef.current?.refresh()}
                    title="Refresh Explorer"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M13 8A5 5 0 113.5 5.5" />
                      <path d="M3 2v4h4" />
                    </svg>
                  </button>
                  {/* Collapse All */}
                  <button
                    className="workspace-explorer-action"
                    onClick={() => fileTreeRef.current?.collapseAll()}
                    title="Collapse Folders"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 4l3 3-3 3" />
                      <path d="M9 4l-3 3 3 3" />
                      <path d="M13 3v10" />
                    </svg>
                  </button>
                  {/* Close */}
                  <button
                    className="workspace-explorer-action"
                    onClick={handleToggleExplorer}
                    title="Close Explorer"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                </div>
              </div>
              <FileTree
                ref={fileTreeRef}
                projectId={project.id}
                projectPath={project.path}
                selectedFile={selectedFile}
                onSelectFile={handleSelectFile}
              />
            </div>
            {selectedFile && (
              <div className="workspace-explorer-editor">
                <CodeViewer
                  projectId={project.id}
                  filePath={selectedFile}
                  onClose={handleCloseFile}
                />
              </div>
            )}
          </div>
        )}
        <div
          className={`workspace-terminal${viewMode === 'focused' ? ' workspace-terminal--collapsed' : ''}`}
          style={terminalStyle}
        >
          {viewMode === 'focused' && (
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
          )}
          <div
            style={{
              display: viewMode === 'focused' ? 'none' : 'flex',
              flex: 1,
              minHeight: 0,
              flexDirection: 'column',
            }}
          >
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              <TerminalGrid
                ref={gridRef}
                projectId={project.id}
                cwd={project.path}
                palette={palette}
                onLocalhostDetected={handleLocalhostDetected}
              />
            </div>
            <InlineTerminalDrawer
              projectId={project.id}
              cwd={project.path}
              palette={palette}
              isOpen={drawerOpen && !showSplitBrowser}
              onToggle={toggleDrawer}
            />
          </div>
        </div>

        {browserEverOpened && (
          <>
            <div
              className={`workspace-divider${showSplitBrowser ? '' : ' workspace-divider--hidden'}`}
              onMouseDown={handleDividerMouseDown}
            />
            <div
              className={`workspace-browser${showSplitBrowser ? '' : ' workspace-browser--hidden'}`}
            >
              {browserPane}
              {isDragging && <div className="workspace-drag-overlay" />}
              <InlineTerminalDrawer
                projectId={project.id}
                cwd={project.path}
                palette={palette}
                isOpen={drawerOpen && showSplitBrowser}
                onToggle={toggleDrawer}
              />
            </div>
          </>
        )}
      </div>

      {viewMode === 'fullscreen' && <div className="browser-fullscreen-overlay">{browserPane}</div>}

      {viewMode === 'pip' && pipPos && (
        <div
          className="browser-pip-container"
          style={{ left: pipPos.x, top: pipPos.y, width: pipSize.w, height: pipSize.h }}
          onMouseDown={handlePipDragStart}
        >
          {browserPane}
          {/* Resize handles — edges */}
          <div
            className="pip-resize pip-resize--n"
            onMouseDown={(e) => handlePipResizeStart(e, 'n')}
          />
          <div
            className="pip-resize pip-resize--s"
            onMouseDown={(e) => handlePipResizeStart(e, 's')}
          />
          <div
            className="pip-resize pip-resize--e"
            onMouseDown={(e) => handlePipResizeStart(e, 'e')}
          />
          <div
            className="pip-resize pip-resize--w"
            onMouseDown={(e) => handlePipResizeStart(e, 'w')}
          />
          {/* Resize handles — corners */}
          <div
            className="pip-resize pip-resize--ne"
            onMouseDown={(e) => handlePipResizeStart(e, 'ne')}
          />
          <div
            className="pip-resize pip-resize--nw"
            onMouseDown={(e) => handlePipResizeStart(e, 'nw')}
          />
          <div
            className="pip-resize pip-resize--se"
            onMouseDown={(e) => handlePipResizeStart(e, 'se')}
          />
          <div
            className="pip-resize pip-resize--sw"
            onMouseDown={(e) => handlePipResizeStart(e, 'sw')}
          />
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

      {showCreateFile && (
        <CreateFileModal projectId={project.id} onClose={() => setShowCreateFile(false)} />
      )}
      {showEditFile && (
        <EditFileModal projectId={project.id} onClose={() => setShowEditFile(false)} />
      )}
    </div>
  )
}

export default React.memo(ProjectWorkspace)
