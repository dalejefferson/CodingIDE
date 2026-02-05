/**
 * InlineTerminalDrawer — toggleable terminal panel that slides up from the
 * bottom of any parent container (browser pane, workspace, etc.).
 *
 * Features:
 *   - Slide-up/down animation
 *   - Drag-to-resize via top handle
 *   - Spawns its own TerminalPane with unique terminalId
 *   - Keyboard shortcut: Cmd+` to toggle
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { TerminalPane } from './TerminalPane'
import '../styles/InlineTerminalDrawer.css'

interface InlineTerminalDrawerProps {
  projectId: string
  cwd: string
  palette: string
  isOpen: boolean
  onToggle: () => void
}

/** Generate a stable terminal ID for the drawer per project */
function drawerTerminalId(projectId: string): string {
  return `drawer-${projectId}`
}

function InlineTerminalDrawerInner({
  projectId,
  cwd,
  palette,
  isOpen,
  onToggle,
}: InlineTerminalDrawerProps) {
  const [drawerHeight, setDrawerHeight] = useState(250)
  const drawerRef = useRef<HTMLDivElement>(null)
  const [hasBeenOpened, setHasBeenOpened] = useState(isOpen)
  const prevHeightRef = useRef(250)

  // Track if drawer has ever been opened to avoid mounting terminal until needed
  useEffect(() => {
    if (isOpen && !hasBeenOpened) setHasBeenOpened(true)
  }, [isOpen, hasBeenOpened])

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const startY = e.clientY
      const startHeight = drawerHeight
      const parent = drawerRef.current?.parentElement
      const maxH = parent ? parent.getBoundingClientRect().height * 0.95 : 600

      document.body.classList.add('is-resizing-v')

      const onMouseMove = (ev: MouseEvent) => {
        const delta = startY - ev.clientY
        const newHeight = Math.max(80, Math.min(maxH, startHeight + delta))
        setDrawerHeight(newHeight)
      }

      const onMouseUp = () => {
        document.body.classList.remove('is-resizing-v')
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        // Fire resize so xterm can refit
        window.dispatchEvent(new Event('resize'))
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [drawerHeight],
  )

  // Double-click handle: toggle between maximized (95% parent) and previous height
  const handleDoubleClick = useCallback(() => {
    const parent = drawerRef.current?.parentElement
    const maxH = parent ? parent.getBoundingClientRect().height * 0.95 : 600
    const isMaximized = Math.abs(drawerHeight - maxH) < 20
    if (isMaximized) {
      setDrawerHeight(prevHeightRef.current)
    } else {
      prevHeightRef.current = drawerHeight
      setDrawerHeight(maxH)
    }
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
  }, [drawerHeight])

  // Fire resize when drawer opens so xterm can fit
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const terminalId = drawerTerminalId(projectId)

  return (
    <div
      ref={drawerRef}
      className={`inline-drawer${isOpen ? ' inline-drawer--open' : ''}`}
      style={{ height: isOpen ? drawerHeight : 0 }}
    >
      {/* Drag handle — double-click to maximize/restore */}
      <div
        className="inline-drawer-handle"
        onMouseDown={handleDragStart}
        onDoubleClick={handleDoubleClick}
      >
        <div className="inline-drawer-handle-grip" />
      </div>

      {/* Header bar */}
      <div className="inline-drawer-header">
        <span className="inline-drawer-title">Terminal</span>
        <button
          type="button"
          className="inline-drawer-close"
          onClick={onToggle}
          title="Close terminal drawer"
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
            <path d="M12 4L4 12M4 4l8 8" />
          </svg>
        </button>
      </div>

      {/* Terminal content — only mount after first open */}
      {hasBeenOpened && (
        <div className="inline-drawer-terminal" style={{ display: isOpen ? 'flex' : 'none' }}>
          <TerminalPane
            terminalId={terminalId}
            projectId={projectId}
            cwd={cwd}
            isActive={isOpen}
            palette={palette}
            onFocus={() => {}}
          />
        </div>
      )}
    </div>
  )
}

export const InlineTerminalDrawer = React.memo(InlineTerminalDrawerInner)
