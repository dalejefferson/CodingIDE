/**
 * useGridKeyboard — keyboard shortcuts for the terminal grid.
 *
 *   Cmd+D      — split active pane right
 *   Shift+Cmd+D — split active pane down
 *   Cmd+W      — show close confirmation / confirm close
 *   Cmd+[/]    — focus previous/next terminal pane
 *   Escape     — dismiss close confirmation
 */

import { useEffect } from 'react'
import type { LayoutNode } from '@shared/terminalLayout'
import { getAdjacentLeafId } from '@shared/terminalLayout'

interface UseGridKeyboardOptions {
  layoutRef: React.MutableRefObject<LayoutNode | null>
  activeLeafRef: React.MutableRefObject<string | null>
  showCloseConfirm: boolean
  setActiveLeafId: (id: string | null) => void
  setShowCloseConfirm: (show: boolean) => void
  handleSplitRight: () => void
  handleSplitDown: () => void
  confirmAndClose: () => void
}

export function useGridKeyboard({
  layoutRef,
  activeLeafRef,
  showCloseConfirm,
  setActiveLeafId,
  setShowCloseConfirm,
  handleSplitRight,
  handleSplitDown,
  confirmAndClose,
}: UseGridKeyboardOptions) {
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
  }, [
    layoutRef,
    activeLeafRef,
    showCloseConfirm,
    setActiveLeafId,
    setShowCloseConfirm,
    handleSplitRight,
    handleSplitDown,
    confirmAndClose,
  ])
}
