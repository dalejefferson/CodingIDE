import { useEffect } from 'react'
import type { BrowserViewMode } from '@shared/types'
import type { MutableRefObject } from 'react'

interface UseWorkspaceKeyboardOptions {
  isVisible: boolean
  viewMode: BrowserViewMode
  previousModeRef: MutableRefObject<BrowserViewMode>
  setViewMode: (mode: BrowserViewMode | ((prev: BrowserViewMode) => BrowserViewMode)) => void
  toggleBrowser: () => void
  toggleDrawer: () => void
  handleToggleExplorer: () => void
}

export function useWorkspaceKeyboard({
  isVisible,
  viewMode,
  previousModeRef,
  setViewMode,
  toggleBrowser,
  toggleDrawer,
  handleToggleExplorer,
}: UseWorkspaceKeyboardOptions) {
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
  }, [isVisible, viewMode, toggleBrowser, toggleDrawer, handleToggleExplorer, previousModeRef, setViewMode])
}
