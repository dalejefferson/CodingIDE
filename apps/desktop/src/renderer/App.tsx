import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import EmptyState from './components/EmptyState'
import ProjectWorkspace from './components/ProjectWorkspace'
const SettingsPage = React.lazy(() =>
  import('./components/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const KanbanPage = React.lazy(() =>
  import('./components/kanban/KanbanPage').then((m) => ({ default: m.KanbanPage })),
)
const AppBuilderPage = React.lazy(() =>
  import('./components/appbuilder/AppBuilderPage').then((m) => ({ default: m.AppBuilderPage })),
)
import { ToastContainer } from './components/ToastContainer'
import { useTheme } from './hooks/useTheme'
import type { TerminalGridHandle } from './components/TerminalGrid'
import type { Project, ClaudeActivityMap, ClaudeStatusMap } from '@shared/types'
import './styles/App.css'

export function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [kanbanOpen, setKanbanOpen] = useState(false)
  const [appBuilderOpen, setAppBuilderOpen] = useState(false)
  const [claudeActivity, setClaudeActivity] = useState<ClaudeActivityMap>({})
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatusMap>({})

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null
  const gridRefsRef = useRef(new Map<string, React.RefObject<TerminalGridHandle>>())

  const activeProjectIdRef = useRef(activeProjectId)
  activeProjectIdRef.current = activeProjectId
  const projectsRef = useRef(projects)
  projectsRef.current = projects

  // Port registry: port → projectId. Prevents browser pane port collisions across projects.
  const portRegistryRef = useRef(new Map<number, string>())

  const getPortOwner = useCallback((port: number): string | null => {
    return portRegistryRef.current.get(port) ?? null
  }, [])

  const registerPort = useCallback((projectId: string, port: number) => {
    portRegistryRef.current.set(port, projectId)
  }, [])

  const unregisterPort = useCallback((projectId: string, port: number) => {
    // Only remove if this project actually owns the port
    if (portRegistryRef.current.get(port) === projectId) {
      portRegistryRef.current.delete(port)
    }
  }, [])

  const getGridRef = useCallback((projectId: string) => {
    let ref = gridRefsRef.current.get(projectId)
    if (!ref) {
      ref = React.createRef<TerminalGridHandle>()
      gridRefsRef.current.set(projectId, ref)
    }
    return ref
  }, [])

  const { palette, setPalette, font, setFont, cyclePalette, cycleFont } = useTheme()

  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), [])
  const toggleSettings = useCallback(() => setSettingsOpen((prev) => !prev), [])

  const handleSelectProject = useCallback((id: string) => {
    setActiveProjectId(id)
    setSettingsOpen(false)
    setKanbanOpen(false)
    setAppBuilderOpen(false)
  }, [])

  const handleGoHome = useCallback(() => {
    setActiveProjectId(null)
    setSettingsOpen(false)
    setKanbanOpen(false)
    setAppBuilderOpen(false)
  }, [])

  const handleOpenKanban = useCallback(() => {
    setKanbanOpen(true)
    setSettingsOpen(false)
    setActiveProjectId(null)
    setAppBuilderOpen(false)
  }, [])

  const handleOpenAppBuilder = useCallback(() => {
    setAppBuilderOpen(true)
    setSettingsOpen(false)
    setKanbanOpen(false)
    setActiveProjectId(null)
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const all = await window.electronAPI.projects.getAll()
      setProjects(all)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }, [])

  const handleOpenTicketAsProject = useCallback(
    async (ticketId: string) => {
      try {
        const project = await window.electronAPI.tickets.openAsProject({ ticketId })
        await loadProjects()
        setActiveProjectId(project.id)
        setKanbanOpen(false)
        setSettingsOpen(false)
        setAppBuilderOpen(false)
      } catch (err) {
        console.error('Failed to open ticket as project:', err)
      }
    },
    [loadProjects],
  )

  const handleOpenFolder = useCallback(async () => {
    try {
      const folderPath = await window.electronAPI.projects.openFolderDialog()
      if (!folderPath) return

      const project = await window.electronAPI.projects.add({ path: folderPath })
      await loadProjects()
      setActiveProjectId(project.id)
    } catch (err) {
      console.error('Failed to open folder:', err)
    }
  }, [loadProjects])

  const handleCreateProject = useCallback(
    async (name: string) => {
      try {
        const folderPath = await window.electronAPI.projects.createFolder({ name })
        if (!folderPath) return

        const project = await window.electronAPI.projects.add({ path: folderPath })
        await loadProjects()
        setActiveProjectId(project.id)
      } catch (err) {
        console.error('Failed to create project:', err)
      }
    },
    [loadProjects],
  )

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    return window.electronAPI.claude.onActivity(setClaudeActivity)
  }, [])

  useEffect(() => {
    return window.electronAPI.claude.onStatus(setClaudeStatus)
  }, [])

  useEffect(() => {
    return window.electronAPI.projects.onStatusChanged((change) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === change.id ? { ...p, status: change.status } : p)),
      )
    })
  }, [])

  // Collapse sidebar when browser pane opens
  useEffect(() => {
    const handler = () => setSidebarCollapsed(true)
    window.addEventListener('sidebar:collapse', handler)
    return () => window.removeEventListener('sidebar:collapse', handler)
  }, [])

  // After sidebar collapse/expand transition completes, fire resize so all
  // terminal panes re-fit to their new dimensions.
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
    return () => clearTimeout(t)
  }, [sidebarCollapsed])

  // Run terminal commands dispatched from other components (e.g. Send to Claude)
  useEffect(() => {
    const handler = (e: Event) => {
      const command = (e as CustomEvent).detail as string
      if (!activeProjectId) return
      gridRefsRef.current.get(activeProjectId)?.current?.runCommand(command)
    }
    window.addEventListener('terminal:run-command', handler)
    return () => window.removeEventListener('terminal:run-command', handler)
  }, [activeProjectId])

  const totalActiveClaudes = useMemo(
    () => Object.values(claudeActivity).reduce((sum, n) => sum + n, 0),
    [claudeActivity],
  )

  const handleRunCommand = useCallback(
    (command: string) => {
      if (!activeProjectId) return
      gridRefsRef.current.get(activeProjectId)?.current?.runCommand(command)
    },
    [activeProjectId],
  )

  /**
   * Global keyboard handler.
   *
   * Cmd/Ctrl+N — open folder dialog (new project)
   * Cmd/Ctrl+P — open command launcher
   * Cmd/Ctrl+B — toggle sidebar
   * Cmd/Ctrl+T — cycle through color palettes
   * Cmd/Ctrl+F — cycle through fonts
   * Ctrl+Tab   — cycle projects forward
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleOpenFolder()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        window.dispatchEvent(new Event('command-launcher:play'))
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
        setKanbanOpen((prev) => {
          if (!prev) {
            setSettingsOpen(false)
            setActiveProjectId(null)
            setAppBuilderOpen(false)
          }
          return !prev
        })
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault()
        setAppBuilderOpen((prev) => {
          if (!prev) {
            setSettingsOpen(false)
            setKanbanOpen(false)
            setActiveProjectId(null)
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
        setActiveProjectId(currentProjects[nextIdx].id)
        setSettingsOpen(false)
        setAppBuilderOpen(false)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cyclePalette, cycleFont, toggleSidebar, handleOpenFolder])

  const handleRemoveProject = useCallback(
    async (id: string) => {
      try {
        await window.electronAPI.projects.remove(id)
        gridRefsRef.current.delete(id)
        if (activeProjectId === id) setActiveProjectId(null)
        await loadProjects()
      } catch (err) {
        console.error('Failed to remove project:', err)
      }
    },
    [activeProjectId, loadProjects],
  )

  const mainContent = (
    <>
      {settingsOpen && (
        <React.Suspense fallback={null}>
          <SettingsPage
            palette={palette}
            font={font}
            onSelectPalette={setPalette}
            onSelectFont={setFont}
          />
        </React.Suspense>
      )}
      {kanbanOpen && !settingsOpen && (
        <React.Suspense fallback={null}>
          <KanbanPage projects={projects} onOpenTicketAsProject={handleOpenTicketAsProject} />
        </React.Suspense>
      )}
      {appBuilderOpen && !settingsOpen && !kanbanOpen && (
        <React.Suspense fallback={null}>
          <AppBuilderPage />
        </React.Suspense>
      )}
      {!settingsOpen && !kanbanOpen && !appBuilderOpen && projects.length === 0 && (
        <EmptyState
          onOpenFolder={handleOpenFolder}
          onCreateProject={handleCreateProject}
          projects={projects}
          onSelectProject={handleSelectProject}
          onOpenKanban={handleOpenKanban}
          onOpenAppBuilder={handleOpenAppBuilder}
        />
      )}
      {!settingsOpen && !kanbanOpen && !appBuilderOpen && projects.length > 0 && !activeProject && (
        <EmptyState
          onOpenFolder={handleOpenFolder}
          onCreateProject={handleCreateProject}
          projects={projects}
          onSelectProject={handleSelectProject}
          onOpenKanban={handleOpenKanban}
          onOpenAppBuilder={handleOpenAppBuilder}
        />
      )}
      {projects.map((p) => (
        <ProjectWorkspace
          key={p.id}
          project={p}
          palette={palette}
          gridRef={getGridRef(p.id)}
          isVisible={p.id === activeProjectId && !settingsOpen && !kanbanOpen && !appBuilderOpen}
          getPortOwner={getPortOwner}
          registerPort={registerPort}
          unregisterPort={unregisterPort}
        />
      ))}
    </>
  )

  return (
    <div className="app">
      <div className={`sidebar-wrapper${sidebarCollapsed ? ' sidebar-wrapper--collapsed' : ''}`}>
        <Sidebar
          projects={projects}
          activeProjectId={activeProjectId}
          collapsed={sidebarCollapsed}
          settingsOpen={settingsOpen}
          kanbanOpen={kanbanOpen}
          appBuilderOpen={appBuilderOpen}
          claudeActivity={claudeActivity}
          claudeStatus={claudeStatus}
          totalActiveClaudes={totalActiveClaudes}
          onToggle={toggleSidebar}
          onSelectProject={handleSelectProject}
          onOpenFolder={handleOpenFolder}
          onRemoveProject={handleRemoveProject}
          onOpenSettings={toggleSettings}
          onGoHome={handleGoHome}
          onOpenKanban={handleOpenKanban}
          onOpenAppBuilder={handleOpenAppBuilder}
        />
      </div>
      <div className="main-pane">
        <Toolbar
          projectName={activeProject?.name ?? null}
          projects={projects}
          activeProjectId={activeProjectId}
          sidebarCollapsed={sidebarCollapsed}
          claudeStatus={claudeStatus}
          onToggleSidebar={toggleSidebar}
          onSelectProject={handleSelectProject}
          onRemoveProject={handleRemoveProject}
          onRunCommand={handleRunCommand}
        />
        <div className="main-content">{mainContent}</div>
      </div>
      <ToastContainer activeProjectId={activeProjectId} onFocusProject={handleSelectProject} />
    </div>
  )
}
