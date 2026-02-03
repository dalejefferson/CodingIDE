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

import { useState, useEffect, useCallback, useRef } from 'react'
import type { LayoutNode } from '@shared/terminalLayout'
import {
  createLeaf,
  splitRight,
  splitDown,
  removeTerminal,
  getAllLeafIds,
  findLeaf,
} from '@shared/terminalLayout'
import { TerminalPane } from './TerminalPane'
import '../styles/TerminalGrid.css'

interface TerminalGridProps {
  projectId: string
  cwd: string
  palette: string
}

export function TerminalGrid({ projectId, cwd, palette }: TerminalGridProps) {
  const [layout, setLayout] = useState<LayoutNode | null>(null)
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null)
  const layoutRef = useRef<LayoutNode | null>(null)
  const activeLeafRef = useRef<string | null>(null)

  // Keep refs in sync for keyboard handler
  useEffect(() => {
    layoutRef.current = layout
    activeLeafRef.current = activeLeafId
  }, [layout, activeLeafId])

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
        const updated = removeTerminal(prev, terminalId)
        if (!updated) {
          // Last terminal exited — create a fresh one
          const leaf = createLeaf()
          setActiveLeafId(leaf.id)
          return leaf
        }
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

  if (!layout) return null

  return (
    <div className="terminal-grid">
      <LayoutRenderer
        node={layout}
        activeLeafId={activeLeafId}
        projectId={projectId}
        cwd={cwd}
        palette={palette}
        onFocusLeaf={setActiveLeafId}
      />
    </div>
  )
}

interface LayoutRendererProps {
  node: LayoutNode
  activeLeafId: string | null
  projectId: string
  cwd: string
  palette: string
  onFocusLeaf: (id: string) => void
}

function LayoutRenderer({
  node,
  activeLeafId,
  projectId,
  cwd,
  palette,
  onFocusLeaf,
}: LayoutRendererProps) {
  if (node.type === 'leaf') {
    return (
      <TerminalPane
        terminalId={node.terminalId}
        projectId={projectId}
        cwd={cwd}
        isActive={node.id === activeLeafId}
        palette={palette}
        onFocus={() => onFocusLeaf(node.id)}
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
          onFocusLeaf={onFocusLeaf}
        />
      </div>
      <div className="terminal-split-divider" />
      <div className="terminal-split-child" style={{ flexBasis: secondPercent }}>
        <LayoutRenderer
          node={node.children[1]}
          activeLeafId={activeLeafId}
          projectId={projectId}
          cwd={cwd}
          palette={palette}
          onFocusLeaf={onFocusLeaf}
        />
      </div>
    </div>
  )
}
