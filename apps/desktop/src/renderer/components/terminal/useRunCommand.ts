/**
 * useRunCommand — imperative runCommand logic for the terminal grid.
 *
 * Exposes a `runCommand(command)` function that splits a new terminal
 * pane to the right of the active pane and queues the command to be sent
 * once the PTY is ready. Reuses the Cmd+P split slot so only one command
 * pane exists at a time.
 */

import { useCallback, useRef } from 'react'
import type { LayoutNode } from '@shared/terminalLayout'
import {
  createLeaf,
  splitRight,
  removeTerminal,
  getAllLeafIds,
  findLeaf,
} from '@shared/terminalLayout'

interface UseRunCommandOptions {
  layoutRef: React.MutableRefObject<LayoutNode | null>
  activeLeafRef: React.MutableRefObject<string | null>
  setLayout: React.Dispatch<React.SetStateAction<LayoutNode | null>>
  setActiveLeafId: (id: string | null) => void
  setPendingCommands: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

export function useRunCommand({
  layoutRef,
  activeLeafRef,
  setLayout,
  setActiveLeafId,
  setPendingCommands,
}: UseRunCommandOptions) {
  /** Leaf ID of the terminal spawned by the last runCommand */
  const cmdPLeafRef = useRef<string | null>(null)
  /** Terminal ID of the command process (survives pane removal) */
  const cmdPTerminalIdRef = useRef<string | null>(null)

  const runCommand = useCallback(
    (command: string) => {
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
            current = createLeaf()
          }
          layoutRef.current = current
        }
        cmdPLeafRef.current = null
        cmdPTerminalIdRef.current = null
      } else if (cmdPTerminalIdRef.current) {
        window.electronAPI.terminal.kill(cmdPTerminalIdRef.current)
        cmdPTerminalIdRef.current = null
      }

      const targetId = activeLeafRef.current ?? getAllLeafIds(current)[0]
      if (!targetId) return
      const newLayout = splitRight(current, targetId)

      const applyNewPane = (layout: LayoutNode, base: LayoutNode) => {
        const newIds = getAllLeafIds(layout)
        const oldIds = getAllLeafIds(base)
        const newId = newIds.find((id) => !oldIds.includes(id))
        if (newId) {
          const newLeaf = findLeaf(layout, newId)
          if (newLeaf) {
            setPendingCommands((prev) => ({ ...prev, [newLeaf.terminalId]: command }))
            cmdPTerminalIdRef.current = newLeaf.terminalId
          }
          cmdPLeafRef.current = newId
          setActiveLeafId(newId)
        }
        setLayout(layout)
      }

      if (newLayout === current) {
        const firstId = getAllLeafIds(current)[0]
        if (!firstId) return
        const freshLayout = splitRight(current, firstId)
        applyNewPane(freshLayout, current)
        return
      }

      applyNewPane(newLayout, current)
    },
    [layoutRef, activeLeafRef, setLayout, setActiveLeafId, setPendingCommands],
  )

  return { runCommand, cmdPLeafRef, cmdPTerminalIdRef }
}
