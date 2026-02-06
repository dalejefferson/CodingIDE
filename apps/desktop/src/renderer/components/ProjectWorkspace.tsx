import React, { useState, useCallback, useMemo } from 'react'
import type { Ref } from 'react'
import type { Project } from '@shared/types'
import { TerminalGrid } from './TerminalGrid'
import type { TerminalGridHandle } from './TerminalGrid'
import { BrowserPane } from './BrowserPane'
import { InlineTerminalDrawer } from './InlineTerminalDrawer'
import { WorkspaceExplorer } from './WorkspaceExplorer'
import { ChangePrompt } from './ChangePrompt'
import { useBrowserPane } from '../hooks/useBrowserPane'
import { usePipResize } from '../hooks/usePipResize'
import { useWorkspaceKeyboard } from '../hooks/useWorkspaceKeyboard'
import { useChangeChaining } from '../hooks/useChangeChaining'
import '../styles/ProjectWorkspace.css'

const TERMINAL_INNER_STYLE: React.CSSProperties = { flex: 1, display: 'flex', minHeight: 0 }

interface ProjectWorkspaceProps {
  project: Project
  palette: string
  gridRef?: Ref<TerminalGridHandle>
  isVisible?: boolean
  getPortOwner?: (port: number) => string | null
  registerPort?: (projectId: string, port: number) => void
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
  const bp = useBrowserPane({ project, isVisible, getPortOwner, registerPort, unregisterPort })
  const { handlePipDragStart, handlePipResizeStart } = usePipResize({
    pipPos: bp.pipPos, pipSize: bp.pipSize, setPipPos: bp.setPipPos, setPipSize: bp.setPipSize,
  })

  // Inline terminal drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Wrap localhost detection to also auto-close the inline terminal drawer
  const handleLocalhostDetectedAndCloseDrawer = useCallback(
    (url: string) => {
      bp.handleLocalhostDetected(url)
      setDrawerOpen(false)
    },
    [bp.handleLocalhostDetected],
  )
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), [])
  const [drawerPendingCommand, setDrawerPendingCommand] = useState<string | undefined>(undefined)
  const clearDrawerCommand = useCallback(() => setDrawerPendingCommand(undefined), [])

  // File explorer state
  const [explorerOpen, setExplorerOpen] = useState(false)
  const handleToggleExplorer = useCallback(() => setExplorerOpen((prev) => !prev), [])

  const cc = useChangeChaining({
    setViewMode: bp.setViewMode,
    setDrawerOpen,
    setDrawerPendingCommand,
  })

  useWorkspaceKeyboard({
    isVisible,
    viewMode: bp.viewMode,
    previousModeRef: bp.previousModeRef,
    setViewMode: bp.setViewMode,
    toggleBrowser: bp.toggleBrowser,
    toggleDrawer,
    handleToggleExplorer,
  })

  const terminalContentStyle = useMemo<React.CSSProperties>(() => ({
    visibility: bp.viewMode === 'focused' ? 'hidden' : undefined,
    flex: bp.viewMode === 'focused' ? 0 : 1,
    minHeight: 0,
    flexDirection: 'column',
    display: 'flex',
    overflow: 'hidden',
  }), [bp.viewMode])

  const browserPane = (
    <BrowserPane
      initialUrl={bp.browserUrl}
      projectId={project.id}
      onPickElement={cc.handlePickElement}
      onUrlChange={bp.handleBrowserUrlChange}
      viewMode={bp.viewMode}
      onChangeViewMode={bp.handleChangeViewMode}
    />
  )

  const PIP_EDGES = ['n', 's', 'e', 'w'] as const
  const PIP_CORNERS = ['ne', 'nw', 'se', 'sw'] as const

  return (
    <div className={`workspace${isVisible ? '' : ' workspace--hidden'}`}>
      <div className="workspace-toggle-bar">
        <button type="button" className={`workspace-toggle-btn${explorerOpen ? ' workspace-toggle-btn--active' : ''}`} onClick={handleToggleExplorer} title="Toggle file explorer (Cmd+E)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2h4.5l1.5 2H14v10H2V2z" /><path d="M2 6h12" />
          </svg>
        </button>
        <button type="button" className={`workspace-toggle-btn${drawerOpen ? ' workspace-toggle-btn--active' : ''}`} onClick={toggleDrawer} title={drawerOpen ? 'Hide terminal drawer (Cmd+`)' : 'Show terminal drawer (Cmd+`)'}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="12" height="12" rx="1.5" /><path d="M2 10h12" /><path d="M5 12.5l1.5-1.5L5 9.5" />
          </svg>
        </button>
        <button type="button" className={`workspace-toggle-btn${bp.browserVisible ? ' workspace-toggle-btn--active' : ''}`} onClick={bp.toggleBrowser} title={bp.browserVisible ? 'Hide browser' : 'Show browser'}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2a10 10 0 014 6 10 10 0 01-4 6 10 10 0 01-4-6A10 10 0 018 2z" />
          </svg>
        </button>
      </div>

      <div ref={bp.panelsRef} className={`workspace-panels${bp.browserEverOpened ? ' workspace-panels--split' : ''}`}>
        {explorerOpen && (
          <WorkspaceExplorer
            projectId={project.id}
            projectPath={project.path}
            onClose={handleToggleExplorer}
          />
        )}
        <div
          className={`workspace-terminal${bp.viewMode === 'focused' ? ' workspace-terminal--collapsed' : ''}`}
          style={bp.terminalStyle}
        >
          {bp.viewMode === 'focused' && (
            <div className="workspace-collapsed-bar" onClick={() => bp.setViewMode('split')} title="Expand terminal">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
              Terminal
            </div>
          )}
          <div style={terminalContentStyle}>
            <div style={TERMINAL_INNER_STYLE}>
              <TerminalGrid ref={gridRef} projectId={project.id} cwd={project.path} palette={palette} onLocalhostDetected={handleLocalhostDetectedAndCloseDrawer} />
            </div>
            <InlineTerminalDrawer
              projectId={project.id} cwd={project.path} palette={palette}
              isOpen={drawerOpen && !bp.showSplitBrowser} onToggle={toggleDrawer}
              pendingCommand={!bp.showSplitBrowser ? drawerPendingCommand : undefined}
              onCommandSent={clearDrawerCommand}
            />
          </div>
        </div>

        {bp.browserEverOpened && (
          <>
            <div className={`workspace-divider${bp.showSplitBrowser ? '' : ' workspace-divider--hidden'}`} onMouseDown={bp.handleDividerMouseDown} />
            <div className={`workspace-browser${bp.showSplitBrowser ? '' : ' workspace-browser--hidden'}`}>
              {browserPane}
              {bp.isDragging && <div className="workspace-drag-overlay" />}
              <InlineTerminalDrawer
                projectId={project.id} cwd={project.path} palette={palette}
                isOpen={drawerOpen && bp.showSplitBrowser} onToggle={toggleDrawer}
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
          {PIP_EDGES.map((d) => (
            <div key={d} className={`pip-resize pip-resize--${d}`} onMouseDown={(e) => handlePipResizeStart(e, d)} />
          ))}
          {PIP_CORNERS.map((d) => (
            <div key={d} className={`pip-resize pip-resize--${d}`} onMouseDown={(e) => handlePipResizeStart(e, d)} />
          ))}
        </div>
      )}

      <ChangePrompt
        pendingPick={cc.pendingPick}
        changeInput={cc.changeInput}
        pickedChanges={cc.pickedChanges}
        onChangeInput={cc.setChangeInput}
        onSubmitChange={cc.handleSubmitChange}
        onRemoveChange={cc.handleRemoveChange}
        onSkipPick={() => cc.setPendingPick(null)}
        onSendToClaude={cc.handleSendToClaude}
        onClearChanges={cc.handleClearChanges}
      />
    </div>
  )
}

export default React.memo(ProjectWorkspace)
