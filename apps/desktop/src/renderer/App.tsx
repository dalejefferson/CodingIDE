import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import EmptyState from './components/EmptyState'
import ProjectWorkspace from './components/ProjectWorkspace'
import { SettingsPage } from './components/SettingsPage'
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
  const [claudeActivity, setClaudeActivity] = useState<ClaudeActivityMap>({})
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatusMap>({})

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null
  const gridRefsRef = useRef(new Map<string, React.RefObject<TerminalGridHandle>>())

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

  const { palette, setPalette, font, setFont, gradient, setGradient, cyclePalette, cycleFont } =
    useTheme()

  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), [])
  const toggleSettings = useCallback(() => setSettingsOpen((prev) => !prev), [])

  const loadProjects = useCallback(async () => {
    try {
      const all = await window.electronAPI.projects.getAll()
      setProjects(all)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }, [])

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

  const totalActiveClaudes = Object.values(claudeActivity).reduce((sum, n) => sum + n, 0)

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

      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        if (projects.length < 2) return
        const currentIdx = projects.findIndex((p) => p.id === activeProjectId)
        const nextIdx = (currentIdx + 1) % projects.length
        setActiveProjectId(projects[nextIdx].id)
        setSettingsOpen(false)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeProjectId, projects, cyclePalette, cycleFont, toggleSidebar, handleOpenFolder])

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
        <SettingsPage
          palette={palette}
          font={font}
          gradient={gradient}
          onSelectPalette={setPalette}
          onSelectFont={setFont}
          onSelectGradient={setGradient}
        />
      )}
      {!settingsOpen && projects.length === 0 && (
        <EmptyState
          onOpenFolder={handleOpenFolder}
          onCreateProject={handleCreateProject}
          projects={projects}
          onSelectProject={(id) => {
            setActiveProjectId(id)
            setSettingsOpen(false)
          }}
        />
      )}
      {!settingsOpen && projects.length > 0 && !activeProject && (
        <EmptyState
          onOpenFolder={handleOpenFolder}
          onCreateProject={handleCreateProject}
          projects={projects}
          onSelectProject={(id) => {
            setActiveProjectId(id)
            setSettingsOpen(false)
          }}
        />
      )}
      {projects.map((p) => (
        <ProjectWorkspace
          key={p.id}
          project={p}
          palette={palette}
          gridRef={getGridRef(p.id)}
          isVisible={p.id === activeProjectId && !settingsOpen}
          getPortOwner={getPortOwner}
          registerPort={registerPort}
          unregisterPort={unregisterPort}
        />
      ))}
    </>
  )

  return (
    <div className={`app gradient-overlay${gradient === 'none' ? ' gradient-overlay--none' : ''}`}>
      <div className={`sidebar-wrapper${sidebarCollapsed ? ' sidebar-wrapper--collapsed' : ''}`}>
        <Sidebar
          projects={projects}
          activeProjectId={activeProjectId}
          collapsed={sidebarCollapsed}
          settingsOpen={settingsOpen}
          claudeActivity={claudeActivity}
          claudeStatus={claudeStatus}
          totalActiveClaudes={totalActiveClaudes}
          onToggle={toggleSidebar}
          onSelectProject={(id) => {
            setActiveProjectId(id)
            setSettingsOpen(false)
          }}
          onOpenFolder={handleOpenFolder}
          onRemoveProject={handleRemoveProject}
          onOpenSettings={toggleSettings}
          onGoHome={() => {
            setActiveProjectId(null)
            setSettingsOpen(false)
          }}
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
          onSelectProject={(id) => {
            setActiveProjectId(id)
            setSettingsOpen(false)
          }}
          onRemoveProject={handleRemoveProject}
          onOpenFolder={handleOpenFolder}
          onRunCommand={handleRunCommand}
        />
        <div className="main-content">{mainContent}</div>
      </div>
      <ToastContainer
        activeProjectId={activeProjectId}
        onFocusProject={(projectId) => {
          setActiveProjectId(projectId)
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}
