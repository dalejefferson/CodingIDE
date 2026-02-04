/**
 * TerminalGrid — renders a tree-based split terminal layout.
 *
 * Supports:
 *   - Cmd+D: split active terminal right
 *   - Shift+Cmd+D: split active terminal down
 *   - Click to focus a terminal pane
 *   - Active terminal has accent border indicator
 *   - Layout persisted per project
 */

import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react'
import type { LayoutNode } from '@shared/terminalLayout'
import {
  createLeaf,
  splitRight,
  splitDown,
  removeTerminal,
  getAllLeafIds,
  findLeaf,
  findLeafIdByTerminalId,
  updateRatio,
} from '@shared/terminalLayout'
import { TerminalPane } from './TerminalPane'
import '../styles/TerminalGrid.css'

export interface TerminalGridHandle {
  runCommand: (command: string) => void
}

interface TerminalGridProps {
  projectId: string
  cwd: string
  palette: string
  onLocalhostDetected?: (url: string) => void
}

export const TerminalGrid = forwardRef<TerminalGridHandle, TerminalGridProps>(function TerminalGrid(
  { projectId, cwd, palette, onLocalhostDetected },
  ref,
) {
  const [layout, setLayout] = useState<LayoutNode | null>(null)
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null)
  const [pendingCommands, setPendingCommands] = useState<Record<string, string>>({})
  const layoutRef = useRef<LayoutNode | null>(null)
  const activeLeafRef = useRef<string | null>(null)

  // Keep refs in sync for keyboard handler
  useEffect(() => {
    layoutRef.current = layout
    activeLeafRef.current = activeLeafId
  }, [layout, activeLeafId])

  // Expose imperative API for running commands in a new pane
  useImperativeHandle(
    ref,
    () => ({
      runCommand(command: string) {
        const current = layoutRef.current
        if (!current) return

        const targetId = activeLeafRef.current ?? getAllLeafIds(current)[0]
        if (!targetId) return
        const newLayout = splitRight(current, targetId)
        if (newLayout === current) {
          // Split failed — single leaf, split it
          const firstId = getAllLeafIds(current)[0]
          if (!firstId) return
          const freshLayout = splitRight(current, firstId)
          const newIds = getAllLeafIds(freshLayout)
          const oldIds = getAllLeafIds(current)
          const newId = newIds.find((id) => !oldIds.includes(id))
          if (newId) {
            const newLeaf = findLeaf(freshLayout, newId)
            if (newLeaf) {
              setPendingCommands((prev) => ({ ...prev, [newLeaf.terminalId]: command }))
            }
            setActiveLeafId(newId)
          }
          setLayout(freshLayout)
          return
        }

        const newLeafIds = getAllLeafIds(newLayout)
        const oldLeafIds = getAllLeafIds(current)
        const newId = newLeafIds.find((id) => !oldLeafIds.includes(id))
        if (newId) {
          const newLeaf = findLeaf(newLayout, newId)
          if (newLeaf) {
            setPendingCommands((prev) => ({ ...prev, [newLeaf.terminalId]: command }))
          }
          setActiveLeafId(newId)
        }
        setLayout(newLayout)
      },
    }),
    [],
  )

  // Load persisted layout or create initial leaf
  useEffect(() => {
    let cancelled = false

    async function loadLayout() {
      try {
        const saved = await window.electronAPI.terminal.getLayout(projectId)
        if (cancelled) return

        if (saved) {
          setLayout(saved)
          const leafIds = getAllLeafIds(saved)
          setActiveLeafId(leafIds[0] ?? null)
        } else {
          const leaf = createLeaf()
          setLayout(leaf)
          setActiveLeafId(leaf.id)
        }
      } catch {
        const leaf = createLeaf()
        setLayout(leaf)
        setActiveLeafId(leaf.id)
      }
    }

    loadLayout()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Persist layout on change
  useEffect(() => {
    if (layout) {
      window.electronAPI.terminal.setLayout(projectId, layout)
    }
  }, [layout, projectId])

  // Handle terminal exit — remove from layout
  useEffect(() => {
    const removeExitListener = window.electronAPI.terminal.onExit((terminalId) => {
      setLayout((prev) => {
        if (!prev) return prev
        // Find the leaf node whose terminalId matches
        const leafId = findLeafIdByTerminalId(prev, terminalId)
        if (!leafId) return prev

        const updated = removeTerminal(prev, leafId)
        if (!updated) {
          // Last terminal exited — create a fresh one
          const leaf = createLeaf()
          setActiveLeafId(leaf.id)
          return leaf
        }
        // If the active pane was removed, focus the first remaining leaf
        const remaining = getAllLeafIds(updated)
        setActiveLeafId((currentActive) => {
          if (!currentActive || !remaining.includes(currentActive)) {
            return remaining[0] ?? null
          }
          return currentActive
        })
        return updated
      })
    })

    return removeExitListener
  }, [])

  const handleSplitRight = useCallback(() => {
    const current = layoutRef.current
    const active = activeLeafRef.current
    if (!current || !active) return

    const newLayout = splitRight(current, active)
    if (newLayout !== current) {
      setLayout(newLayout)
      // Focus the new pane
      const newLeafIds = getAllLeafIds(newLayout)
      const oldLeafIds = getAllLeafIds(current)
      const newId = newLeafIds.find((id) => !oldLeafIds.includes(id))
      if (newId) setActiveLeafId(newId)
    }
  }, [])

  const handleSplitDown = useCallback(() => {
    const current = layoutRef.current
    const active = activeLeafRef.current
    if (!current || !active) return

    const newLayout = splitDown(current, active)
    if (newLayout !== current) {
      setLayout(newLayout)
      const newLeafIds = getAllLeafIds(newLayout)
      const oldLeafIds = getAllLeafIds(current)
      const newId = newLeafIds.find((id) => !oldLeafIds.includes(id))
      if (newId) setActiveLeafId(newId)
    }
  }, [])

  const handleClosePane = useCallback(() => {
    const current = layoutRef.current
    const active = activeLeafRef.current
    if (!current || !active) return

    const leaf = findLeaf(current, active)
    if (leaf) {
      window.electronAPI.terminal.kill(leaf.terminalId)
    }

    const newLayout = removeTerminal(current, active)
    if (!newLayout) {
      const fresh = createLeaf()
      setLayout(fresh)
      setActiveLeafId(fresh.id)
    } else {
      setLayout(newLayout)
      setActiveLeafId(getAllLeafIds(newLayout)[0] ?? null)
    }
  }, [])

  const handleRatioChange = useCallback((branchId: string, newRatio: number) => {
    setLayout((prev) => (prev ? updateRatio(prev, branchId, newRatio) : prev))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+W: close active pane
      if (e.metaKey && !e.shiftKey && e.key === 'w') {
        e.preventDefault()
        handleClosePane()
        return
      }

      // Cmd+D: split right
      if (e.metaKey && !e.shiftKey && e.key === 'd') {
        e.preventDefault()
        handleSplitRight()
        return
      }

      // Shift+Cmd+D: split down
      if (e.metaKey && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        handleSplitDown()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSplitRight, handleSplitDown, handleClosePane])

  const handleCommandSent = useCallback((terminalId: string) => {
    setPendingCommands((prev) => {
      if (!(terminalId in prev)) return prev
      const next = { ...prev }
      delete next[terminalId]
      return next
    })
  }, [])

  if (!layout) return null

  return (
    <div className="terminal-grid">
      <LayoutRenderer
        node={layout}
        activeLeafId={activeLeafId}
        projectId={projectId}
        cwd={cwd}
        palette={palette}
        pendingCommands={pendingCommands}
        onFocusLeaf={setActiveLeafId}
        onRatioChange={handleRatioChange}
        onCommandSent={handleCommandSent}
        onLocalhostDetected={onLocalhostDetected}
      />
    </div>
  )
})

interface LayoutRendererProps {
  node: LayoutNode
  activeLeafId: string | null
  projectId: string
  cwd: string
  palette: string
  pendingCommands: Record<string, string>
  onFocusLeaf: (id: string) => void
  onRatioChange: (branchId: string, newRatio: number) => void
  onCommandSent: (terminalId: string) => void
  onLocalhostDetected?: (url: string) => void
}

function LayoutRenderer({
  node,
  activeLeafId,
  projectId,
  cwd,
  palette,
  pendingCommands,
  onFocusLeaf,
  onRatioChange,
  onCommandSent,
  onLocalhostDetected,
}: LayoutRendererProps) {
  if (node.type === 'leaf') {
    return (
      <TerminalPane
        terminalId={node.terminalId}
        projectId={projectId}
        cwd={cwd}
        isActive={node.id === activeLeafId}
        palette={palette}
        pendingCommand={pendingCommands[node.terminalId]}
        onFocus={() => onFocusLeaf(node.id)}
        onCommandSent={() => onCommandSent(node.terminalId)}
        onLocalhostDetected={onLocalhostDetected}
      />
    )
  }

  const isHorizontal = node.direction === 'horizontal'
  const firstPercent = `${node.ratio * 100}%`
  const secondPercent = `${(1 - node.ratio) * 100}%`

  return (
    <div
      className={`terminal-split terminal-split--${node.direction}`}
      style={{
        flexDirection: isHorizontal ? 'row' : 'column',
      }}
    >
      <div className="terminal-split-child" style={{ flexBasis: firstPercent }}>
        <LayoutRenderer
          node={node.children[0]}
          activeLeafId={activeLeafId}
          projectId={projectId}
          cwd={cwd}
          palette={palette}
          pendingCommands={pendingCommands}
          onFocusLeaf={onFocusLeaf}
          onRatioChange={onRatioChange}
          onCommandSent={onCommandSent}
          onLocalhostDetected={onLocalhostDetected}
        />
      </div>
      <SplitDivider branchId={node.id} direction={node.direction} onRatioChange={onRatioChange} />
      <div className="terminal-split-child" style={{ flexBasis: secondPercent }}>
        <LayoutRenderer
          node={node.children[1]}
          activeLeafId={activeLeafId}
          projectId={projectId}
          cwd={cwd}
          palette={palette}
          pendingCommands={pendingCommands}
          onFocusLeaf={onFocusLeaf}
          onRatioChange={onRatioChange}
          onCommandSent={onCommandSent}
          onLocalhostDetected={onLocalhostDetected}
        />
      </div>
    </div>
  )
}

/** Interactive split divider with drag-to-resize */
function SplitDivider({
  branchId,
  direction,
  onRatioChange,
}: {
  branchId: string
  direction: 'horizontal' | 'vertical'
  onRatioChange: (branchId: string, newRatio: number) => void
}) {
  const dividerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()

      const parent = dividerRef.current?.parentElement
      if (!parent) return

      const isH = direction === 'horizontal'
      document.body.classList.add(isH ? 'is-resizing-h' : 'is-resizing-v')

      const parentRect = parent.getBoundingClientRect()
      const totalSize = isH ? parentRect.width : parentRect.height
      const parentStart = isH ? parentRect.left : parentRect.top

      const onMouseMove = (ev: MouseEvent) => {
        const pos = isH ? ev.clientX : ev.clientY
        const newRatio = (pos - parentStart) / totalSize
        onRatioChange(branchId, newRatio)
      }

      const onMouseUp = () => {
        document.body.classList.remove('is-resizing-h', 'is-resizing-v')
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [branchId, direction, onRatioChange],
  )

  return <div ref={dividerRef} className="terminal-split-divider" onMouseDown={handleMouseDown} />
}
