import React, { useState, useCallback, useRef } from 'react'
import type { Ref } from 'react'
import type { Project } from '@shared/types'
import { TerminalGrid } from './TerminalGrid'
import type { TerminalGridHandle } from './TerminalGrid'
import { BrowserPane } from './BrowserPane'
import { InlineTerminalDrawer } from './InlineTerminalDrawer'
import { FileTree } from './FileTree'
import type { FileTreeHandle } from './FileTree'
import { CodeViewer } from './CodeViewer'
import { ChangePrompt } from './ChangePrompt'
import { useBrowserPane } from '../hooks/useBrowserPane'
import { usePipResize } from '../hooks/usePipResize'
import { useWorkspaceKeyboard } from '../hooks/useWorkspaceKeyboard'
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

function ProjectWorkspace({
  project,
  palette,
  gridRef,
  isVisible = true,
  getPortOwner,
  registerPort,
  unregisterPort,
}: ProjectWorkspaceProps) {
  const bp = useBrowserPane({
    project,
    isVisible,
    getPortOwner,
    registerPort,
    unregisterPort,
  })

  const { handlePipDragStart, handlePipResizeStart } = usePipResize({
    pipPos: bp.pipPos,
    pipSize: bp.pipSize,
    setPipPos: bp.setPipPos,
    setPipSize: bp.setPipSize,
  })

  // Inline terminal drawer state (toggled per-pane terminal)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), [])
  const [drawerPendingCommand, setDrawerPendingCommand] = useState<string | undefined>(undefined)
  const clearDrawerCommand = useCallback(() => setDrawerPendingCommand(undefined), [])

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

  // Change-chaining state
  const [pickedChanges, setPickedChanges] = useState<PickedChange[]>([])
  const [pendingPick, setPendingPick] = useState<string | null>(null)
  const [changeInput, setChangeInput] = useState('')

  useWorkspaceKeyboard({
    isVisible,
    viewMode: bp.viewMode,
    previousModeRef: bp.previousModeRef,
    setViewMode: bp.setViewMode,
    toggleBrowser: bp.toggleBrowser,
    toggleDrawer,
    handleToggleExplorer,
  })

  const handlePickElement = useCallback((formatted: string) => {
    setPendingPick(formatted)
    setChangeInput('')
  }, [])

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
    bp.setViewMode('split')
    setDrawerOpen(true)
    setDrawerPendingCommand(`cc '${escaped}'`)
    setPickedChanges([])
    setPendingPick(null)
    setChangeInput('')
  }, [pickedChanges, bp])

  const handleClearChanges = useCallback(() => {
    setPickedChanges([])
    setPendingPick(null)
    setChangeInput('')
  }, [])

  const browserPane = (
    <BrowserPane
      initialUrl={bp.browserUrl}
      projectId={project.id}
      onPickElement={handlePickElement}
      onUrlChange={bp.handleBrowserUrlChange}
      viewMode={bp.viewMode}
      onChangeViewMode={bp.handleChangeViewMode}
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
          className={`workspace-toggle-btn${bp.browserVisible ? ' workspace-toggle-btn--active' : ''}`}
          onClick={bp.toggleBrowser}
          title={bp.browserVisible ? 'Hide browser' : 'Show browser'}
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
        ref={bp.panelsRef}
        className={`workspace-panels${bp.browserEverOpened ? ' workspace-panels--split' : ''}`}
      >
        {explorerOpen && (
          <div className="workspace-explorer">
            <div className="workspace-explorer-tree">
              <div className="workspace-explorer-tree-header">
                <span className="workspace-explorer-tree-title">Explorer</span>
                <div className="workspace-explorer-actions">
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
          className={`workspace-terminal${bp.viewMode === 'focused' ? ' workspace-terminal--collapsed' : ''}`}
          style={bp.terminalStyle}
        >
          {bp.viewMode === 'focused' && (
            <div
              className="workspace-collapsed-bar"
              onClick={() => bp.setViewMode('split')}
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
              visibility: bp.viewMode === 'focused' ? 'hidden' : undefined,
              flex: bp.viewMode === 'focused' ? 0 : 1,
              minHeight: 0,
              flexDirection: 'column',
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              <TerminalGrid
                ref={gridRef}
                projectId={project.id}
                cwd={project.path}
                palette={palette}
                onLocalhostDetected={bp.handleLocalhostDetected}
              />
            </div>
            <InlineTerminalDrawer
              projectId={project.id}
              cwd={project.path}
              palette={palette}
              isOpen={drawerOpen && !bp.showSplitBrowser}
              onToggle={toggleDrawer}
              pendingCommand={!bp.showSplitBrowser ? drawerPendingCommand : undefined}
              onCommandSent={clearDrawerCommand}
            />
          </div>
        </div>

        {bp.browserEverOpened && (
          <>
            <div
              className={`workspace-divider${bp.showSplitBrowser ? '' : ' workspace-divider--hidden'}`}
              onMouseDown={bp.handleDividerMouseDown}
            />
            <div
              className={`workspace-browser${bp.showSplitBrowser ? '' : ' workspace-browser--hidden'}`}
            >
              {browserPane}
              {bp.isDragging && <div className="workspace-drag-overlay" />}
              <InlineTerminalDrawer
                projectId={project.id}
                cwd={project.path}
                palette={palette}
                isOpen={drawerOpen && bp.showSplitBrowser}
                onToggle={toggleDrawer}
                pendingCommand={bp.showSplitBrowser ? drawerPendingCommand : undefined}
                onCommandSent={clearDrawerCommand}
              />
            </div>
          </>
        )}
      </div>

      {bp.viewMode === 'fullscreen' && <div className="browser-fullscreen-overlay">{browserPane}</div>}

      {bp.viewMode === 'pip' && bp.pipPos && (
        <div
          className="browser-pip-container"
          style={{ left: bp.pipPos.x, top: bp.pipPos.y, width: bp.pipSize.w, height: bp.pipSize.h }}
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

      <ChangePrompt
        pendingPick={pendingPick}
        changeInput={changeInput}
        pickedChanges={pickedChanges}
        onChangeInput={setChangeInput}
        onSubmitChange={handleSubmitChange}
        onRemoveChange={handleRemoveChange}
        onSkipPick={() => setPendingPick(null)}
        onSendToClaude={handleSendToClaude}
        onClearChanges={handleClearChanges}
      />
    </div>
  )
}

export default React.memo(ProjectWorkspace)
