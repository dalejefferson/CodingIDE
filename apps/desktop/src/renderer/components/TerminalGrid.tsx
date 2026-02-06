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

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react'
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
import { LayoutRenderer } from './terminal/LayoutRenderer'
import { CloseConfirmDialog } from './terminal/CloseConfirmDialog'
import { useGridKeyboard } from './terminal/useGridKeyboard'
import { useRunCommand } from './terminal/useRunCommand'
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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const layoutRef = useRef<LayoutNode | null>(null)
  const activeLeafRef = useRef<string | null>(null)

  useEffect(() => {
    layoutRef.current = layout
    activeLeafRef.current = activeLeafId
  }, [layout, activeLeafId])

  const { runCommand, cmdPLeafRef, cmdPTerminalIdRef } = useRunCommand({
    layoutRef, activeLeafRef, setLayout, setActiveLeafId, setPendingCommands,
  })

  useImperativeHandle(ref, () => ({ runCommand }), [runCommand])

  // Load persisted layout or create initial leaf
  useEffect(() => {
    let cancelled = false
    cmdPLeafRef.current = null
    cmdPTerminalIdRef.current = null
    async function loadLayout() {
      try {
        const saved = await window.electronAPI.terminal.getLayout(projectId)
        if (cancelled) return
        if (saved) {
          setLayout(saved)
          setActiveLeafId(getAllLeafIds(saved)[0] ?? null)
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
    return () => { cancelled = true }
  }, [projectId, cmdPLeafRef, cmdPTerminalIdRef])

  // Persist layout on change
  useEffect(() => {
    if (layout) window.electronAPI.terminal.setLayout(projectId, layout)
  }, [layout, projectId])

  // Handle terminal exit — remove from layout
  useEffect(() => {
    const removeExitListener = window.electronAPI.terminal.onExit((terminalId) => {
      if (terminalId === cmdPTerminalIdRef.current) cmdPTerminalIdRef.current = null
      setLayout((prev) => {
        if (!prev) return prev
        const leafId = findLeafIdByTerminalId(prev, terminalId)
        if (!leafId) return prev
        if (leafId === cmdPLeafRef.current) cmdPLeafRef.current = null
        const updated = removeTerminal(prev, leafId)
        if (!updated) {
          const leaf = createLeaf()
          setActiveLeafId(leaf.id)
          return leaf
        }
        const remaining = getAllLeafIds(updated)
        setActiveLeafId((cur) => (!cur || !remaining.includes(cur) ? remaining[0] ?? null : cur))
        return updated
      })
    })
    return removeExitListener
  }, [cmdPLeafRef, cmdPTerminalIdRef])

  const handleSplitRight = useCallback(() => {
    const current = layoutRef.current
    const active = activeLeafRef.current
    if (!current || !active) return
    const newLayout = splitRight(current, active)
    if (newLayout !== current) {
      setLayout(newLayout)
      const newId = getAllLeafIds(newLayout).find((id) => !getAllLeafIds(current).includes(id))
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
      const newId = getAllLeafIds(newLayout).find((id) => !getAllLeafIds(current).includes(id))
      if (newId) setActiveLeafId(newId)
    }
  }, [])

  const handleClosePane = useCallback(() => {
    const current = layoutRef.current
    const active = activeLeafRef.current
    if (!current || !active) return
    if (active === cmdPLeafRef.current) { cmdPLeafRef.current = null; cmdPTerminalIdRef.current = null }
    const leaf = findLeaf(current, active)
    if (leaf) window.electronAPI.terminal.kill(leaf.terminalId)
    const newLayout = removeTerminal(current, active)
    if (!newLayout) {
      const fresh = createLeaf()
      setLayout(fresh)
      setActiveLeafId(fresh.id)
    } else {
      setLayout(newLayout)
      setActiveLeafId(getAllLeafIds(newLayout)[0] ?? null)
    }
  }, [cmdPLeafRef, cmdPTerminalIdRef])

  const handleRatioChange = useCallback((branchId: string, newRatio: number) => {
    setLayout((prev) => (prev ? updateRatio(prev, branchId, newRatio) : prev))
  }, [])

  const confirmAndClose = useCallback(() => {
    setShowCloseConfirm(false)
    handleClosePane()
  }, [handleClosePane])

  useGridKeyboard({
    layoutRef, activeLeafRef, showCloseConfirm, setActiveLeafId,
    setShowCloseConfirm, handleSplitRight, handleSplitDown, confirmAndClose,
  })

  // Wrap onLocalhostDetected — auto-remove Cmd+P pane on localhost detection
  const wrappedLocalhostDetected = useCallback(
    (terminalId: string, url: string) => {
      if (terminalId === cmdPTerminalIdRef.current && cmdPLeafRef.current) {
        const leafId = cmdPLeafRef.current
        cmdPLeafRef.current = null
        setLayout((prev) => {
          if (!prev) return prev
          const updated = removeTerminal(prev, leafId)
          if (!updated) { const leaf = createLeaf(); setActiveLeafId(leaf.id); return leaf }
          const remaining = getAllLeafIds(updated)
          setActiveLeafId((cur) => (!cur || !remaining.includes(cur) ? remaining[0] ?? null : cur))
          return updated
        })
      }
      onLocalhostDetected?.(url)
    },
    [onLocalhostDetected, cmdPLeafRef, cmdPTerminalIdRef],
  )

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
        onLocalhostDetected={wrappedLocalhostDetected}
      />
      {showCloseConfirm && (
        <CloseConfirmDialog onConfirm={confirmAndClose} onCancel={() => setShowCloseConfirm(false)} />
      )}
    </div>
  )
})
