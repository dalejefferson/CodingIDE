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
  getAdjacentLeafId,
} from '@shared/terminalLayout'
import { LayoutRenderer } from './terminal/LayoutRenderer'
import { CloseConfirmDialog } from './terminal/CloseConfirmDialog'
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
  /** Leaf ID of the terminal spawned by the last Cmd+P runCommand */
  const cmdPLeafRef = useRef<string | null>(null)
  /** Terminal ID of the Cmd+P server process (survives pane removal) */
  const cmdPTerminalIdRef = useRef<string | null>(null)

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
        let current = layoutRef.current
        if (!current) return

        // If a previous Cmd+P terminal exists, kill and remove it first
        const prevLeafId = cmdPLeafRef.current
        if (prevLeafId) {
          const prevLeaf = findLeaf(current, prevLeafId)
          if (prevLeaf) {
            window.electronAPI.terminal.kill(prevLeaf.terminalId)
            const shrunk = removeTerminal(current, prevLeafId)
            if (shrunk) {
              current = shrunk
            } else {
              // That was the only terminal — start fresh from a new leaf
              current = createLeaf()
            }
            // Sync refs so the split below uses the updated tree
            layoutRef.current = current
          }
          cmdPLeafRef.current = null
          cmdPTerminalIdRef.current = null
        } else if (cmdPTerminalIdRef.current) {
          // Leaf was already removed (auto-closed after localhost detection),
          // but the server process is still running — kill it now.
          window.electronAPI.terminal.kill(cmdPTerminalIdRef.current)
          cmdPTerminalIdRef.current = null
        }

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
              cmdPTerminalIdRef.current = newLeaf.terminalId
            }
            cmdPLeafRef.current = newId
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
            cmdPTerminalIdRef.current = newLeaf.terminalId
          }
          cmdPLeafRef.current = newId
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
    // Reset Cmd+P tracking when switching projects
    cmdPLeafRef.current = null
    cmdPTerminalIdRef.current = null

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
      // Clear Cmd+P refs if this was the server process
      if (terminalId === cmdPTerminalIdRef.current) {
        cmdPTerminalIdRef.current = null
      }

      setLayout((prev) => {
        if (!prev) return prev
        // Find the leaf node whose terminalId matches
        const leafId = findLeafIdByTerminalId(prev, terminalId)
        if (!leafId) return prev

        // Clear Cmd+P ref if this was the command terminal
        if (leafId === cmdPLeafRef.current) {
          cmdPLeafRef.current = null
        }

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

    // Clear Cmd+P refs if this pane was the command terminal
    if (active === cmdPLeafRef.current) {
      cmdPLeafRef.current = null
      cmdPTerminalIdRef.current = null
    }

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

  const confirmAndClose = useCallback(() => {
    setShowCloseConfirm(false)
    handleClosePane()
  }, [handleClosePane])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+[ : focus previous terminal pane
      if (e.metaKey && !e.shiftKey && !e.altKey && e.key === '[') {
        e.preventDefault()
        const current = layoutRef.current
        const active = activeLeafRef.current
        if (current && active) {
          const prev = getAdjacentLeafId(current, active, -1)
          if (prev) setActiveLeafId(prev)
        }
        return
      }

      // Cmd+] : focus next terminal pane
      if (e.metaKey && !e.shiftKey && !e.altKey && e.key === ']') {
        e.preventDefault()
        const current = layoutRef.current
        const active = activeLeafRef.current
        if (current && active) {
          const next = getAdjacentLeafId(current, active, 1)
          if (next) setActiveLeafId(next)
        }
        return
      }

      // Cmd+W: show close confirmation for active pane
      if (e.metaKey && !e.shiftKey && e.key === 'w') {
        e.preventDefault()
        if (showCloseConfirm) {
          confirmAndClose()
        } else {
          setShowCloseConfirm(true)
        }
        return
      }

      // Escape: dismiss close confirmation
      if (e.key === 'Escape' && showCloseConfirm) {
        e.preventDefault()
        setShowCloseConfirm(false)
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
  }, [handleSplitRight, handleSplitDown, handleClosePane, showCloseConfirm, confirmAndClose])

  // Wrap onLocalhostDetected so that when the Cmd+P terminal detects a localhost
  // URL, we remove the pane from the grid (but keep the server process running).
  const wrappedLocalhostDetected = useCallback(
    (terminalId: string, url: string) => {
      if (terminalId === cmdPTerminalIdRef.current && cmdPLeafRef.current) {
        const leafId = cmdPLeafRef.current
        cmdPLeafRef.current = null

        setLayout((prev) => {
          if (!prev) return prev
          const updated = removeTerminal(prev, leafId)
          if (!updated) {
            const leaf = createLeaf()
            setActiveLeafId(leaf.id)
            return leaf
          }
          const remaining = getAllLeafIds(updated)
          setActiveLeafId((currentActive) => {
            if (!currentActive || !remaining.includes(currentActive)) {
              return remaining[0] ?? null
            }
            return currentActive
          })
          return updated
        })
      }
      onLocalhostDetected?.(url)
    },
    [onLocalhostDetected],
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
        <CloseConfirmDialog
          onConfirm={confirmAndClose}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </div>
  )
})
