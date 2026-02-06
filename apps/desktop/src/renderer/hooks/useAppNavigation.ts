/**
 * useAppNavigation — manages which top-level view is active in the app.
 *
 * The app has mutually-exclusive views: project, settings, kanban,
 * app builder, idea log.  Each "open" handler sets one view and clears
 * the others.  This hook owns the boolean flags and provides stable
 * toggle/open callbacks.
 */

import { useState, useCallback } from 'react'

export function useAppNavigation() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [kanbanOpen, setKanbanOpen] = useState(false)
  const [appBuilderOpen, setAppBuilderOpen] = useState(false)
  const [ideaLogOpen, setIdeaLogOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const clearPanels = useCallback(() => {
    setSettingsOpen(false)
    setKanbanOpen(false)
    setAppBuilderOpen(false)
    setIdeaLogOpen(false)
  }, [])

  const handleSelectProject = useCallback(
    (id: string) => {
      setActiveProjectId(id)
      clearPanels()
    },
    [clearPanels],
  )

  const handleGoHome = useCallback(() => {
    setActiveProjectId(null)
    clearPanels()
  }, [clearPanels])

  const handleOpenKanban = useCallback(() => {
    clearPanels()
    setKanbanOpen(true)
    setActiveProjectId(null)
  }, [clearPanels])

  const handleOpenAppBuilder = useCallback(() => {
    clearPanels()
    setAppBuilderOpen(true)
    setActiveProjectId(null)
  }, [clearPanels])

  const handleOpenIdeaLog = useCallback(() => {
    clearPanels()
    setIdeaLogOpen(true)
    setActiveProjectId(null)
  }, [clearPanels])

  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), [])
  const toggleSettings = useCallback(() => setSettingsOpen((prev) => !prev), [])

  /** After opening a project from ticket/expo, focus it and close panels. */
  const focusProject = useCallback(
    (projectId: string) => {
      setActiveProjectId(projectId)
      clearPanels()
    },
    [clearPanels],
  )

  return {
    activeProjectId,
    setActiveProjectId,
    settingsOpen,
    setSettingsOpen,
    kanbanOpen,
    setKanbanOpen,
    appBuilderOpen,
    setAppBuilderOpen,
    ideaLogOpen,
    setIdeaLogOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    handleSelectProject,
    handleGoHome,
    handleOpenKanban,
    handleOpenAppBuilder,
    handleOpenIdeaLog,
    toggleSidebar,
    toggleSettings,
    focusProject,
  }
}
