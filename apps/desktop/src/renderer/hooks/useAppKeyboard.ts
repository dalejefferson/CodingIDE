import { useEffect, useRef } from 'react'
import { emit } from '../utils/eventBus'

interface UseAppKeyboardOptions {
  cyclePalette: () => void
  cycleFont: () => void
  toggleSidebar: () => void
  handleOpenFolder: () => void
  projectsRef: React.MutableRefObject<{ id: string }[]>
  activeProjectIdRef: React.MutableRefObject<string | null>
  setActiveProjectId: (id: string | null) => void
  setSettingsOpen: (fn: (prev: boolean) => boolean) => void
  setKanbanOpen: (fn: (prev: boolean) => boolean) => void
  setAppBuilderOpen: (fn: (prev: boolean) => boolean) => void
  setIdeaLogOpen: (fn: (prev: boolean) => boolean) => void
}

export function useAppKeyboard({
  cyclePalette,
  cycleFont,
  toggleSidebar,
  handleOpenFolder,
  projectsRef,
  activeProjectIdRef,
  setActiveProjectId,
  setSettingsOpen,
  setKanbanOpen,
  setAppBuilderOpen,
  setIdeaLogOpen,
}: UseAppKeyboardOptions) {
  // Wrap setters in refs to keep them stable without requiring them as deps
  const stableRef = useRef({
    setActiveProjectId,
    setSettingsOpen,
    setKanbanOpen,
    setAppBuilderOpen,
    setIdeaLogOpen,
  })
  stableRef.current = {
    setActiveProjectId,
    setSettingsOpen,
    setKanbanOpen,
    setAppBuilderOpen,
    setIdeaLogOpen,
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleOpenFolder()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        emit('command-launcher:play')
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        cyclePalette()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        cycleFont()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        stableRef.current.setKanbanOpen((prev) => {
          if (!prev) {
            stableRef.current.setSettingsOpen(() => false)
            stableRef.current.setActiveProjectId(null)
            stableRef.current.setAppBuilderOpen(() => false)
            stableRef.current.setIdeaLogOpen(() => false)
          }
          return !prev
        })
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault()
        stableRef.current.setAppBuilderOpen((prev) => {
          if (!prev) {
            stableRef.current.setSettingsOpen(() => false)
            stableRef.current.setKanbanOpen(() => false)
            stableRef.current.setActiveProjectId(null)
            stableRef.current.setIdeaLogOpen(() => false)
          }
          return !prev
        })
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault()
        stableRef.current.setIdeaLogOpen((prev) => {
          if (!prev) {
            stableRef.current.setSettingsOpen(() => false)
            stableRef.current.setKanbanOpen(() => false)
            stableRef.current.setAppBuilderOpen(() => false)
            stableRef.current.setActiveProjectId(null)
          }
          return !prev
        })
        return
      }

      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        const currentProjects = projectsRef.current
        if (currentProjects.length < 2) return
        const currentIdx = currentProjects.findIndex((p) => p.id === activeProjectIdRef.current)
        const nextIdx = (currentIdx + 1) % currentProjects.length
        stableRef.current.setActiveProjectId(currentProjects[nextIdx].id)
        stableRef.current.setSettingsOpen(() => false)
        stableRef.current.setAppBuilderOpen(() => false)
        stableRef.current.setIdeaLogOpen(() => false)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cyclePalette, cycleFont, toggleSidebar, handleOpenFolder, projectsRef, activeProjectIdRef])
}
