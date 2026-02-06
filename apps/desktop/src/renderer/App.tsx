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
const MobileWorkspace = React.lazy(() =>
  import('./components/appbuilder/MobileWorkspace').then((m) => ({ default: m.MobileWorkspace })),
)
const IdeaLogPage = React.lazy(() =>
  import('./components/idealog/IdeaLogPage').then((m) => ({ default: m.IdeaLogPage })),
)
import { ToastContainer } from './components/ToastContainer'
import { PrdGenerationIndicator } from './components/PrdGenerationIndicator'
import { useTheme } from './hooks/useTheme'
import { useExpoApps } from './hooks/useExpoApps'
import { usePrdGeneration } from './hooks/usePrdGeneration'
import { usePortRegistry } from './hooks/usePortRegistry'
import { useAppKeyboard } from './hooks/useAppKeyboard'
import { useIdeaHandlers } from './hooks/useIdeaHandlers'
import { useWordVomitHandlers } from './hooks/useWordVomitHandlers'
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
  const [ideaLogOpen, setIdeaLogOpen] = useState(false)
  const [claudeActivity, setClaudeActivity] = useState<ClaudeActivityMap>({})
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatusMap>({})
  const [wordVomitPrdForApp, setWordVomitPrdForApp] = useState<string | null>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null
  const gridRefsRef = useRef(new Map<string, React.RefObject<TerminalGridHandle>>())

  const activeProjectIdRef = useRef(activeProjectId)
  activeProjectIdRef.current = activeProjectId
  const projectsRef = useRef(projects)
  projectsRef.current = projects

  const { getPortOwner, registerPort, unregisterPort } = usePortRegistry()

  const getGridRef = useCallback((projectId: string) => {
    let ref = gridRefsRef.current.get(projectId)
    if (!ref) {
      ref = React.createRef<TerminalGridHandle>()
      gridRefsRef.current.set(projectId, ref)
    }
    return ref
  }, [])

  const { palette, setPalette, font, setFont, cyclePalette, cycleFont } = useTheme()
  const { mobileApps, startApp, stopApp } = useExpoApps()
  const prdGen = usePrdGeneration()

  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), [])
  const toggleSettings = useCallback(() => setSettingsOpen((prev) => !prev), [])

  const handleSelectProject = useCallback((id: string) => {
    setActiveProjectId(id)
    setSettingsOpen(false)
    setKanbanOpen(false)
    setAppBuilderOpen(false)
    setIdeaLogOpen(false)
  }, [])

  const handleGoHome = useCallback(() => {
    setActiveProjectId(null)
    setSettingsOpen(false)
    setKanbanOpen(false)
    setAppBuilderOpen(false)
    setIdeaLogOpen(false)
  }, [])

  const handleOpenKanban = useCallback(() => {
    setKanbanOpen(true)
    setSettingsOpen(false)
    setActiveProjectId(null)
    setAppBuilderOpen(false)
    setIdeaLogOpen(false)
  }, [])

  const handleOpenAppBuilder = useCallback(() => {
    setAppBuilderOpen(true)
    setSettingsOpen(false)
    setKanbanOpen(false)
    setActiveProjectId(null)
    setIdeaLogOpen(false)
  }, [])

  const handleOpenIdeaLog = useCallback(() => {
    setIdeaLogOpen(true)
    setSettingsOpen(false)
    setKanbanOpen(false)
    setAppBuilderOpen(false)
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
        setIdeaLogOpen(false)
      } catch (err) {
        console.error('Failed to open ticket as project:', err)
      }
    },
    [loadProjects],
  )

  const handleEditAndPreview = useCallback(
    async (appId: string) => {
      try {
        const project = await window.electronAPI.expo.openAsProject({ appId })
        await loadProjects()
        setActiveProjectId(project.id)
        setAppBuilderOpen(false)
        setSettingsOpen(false)
        setKanbanOpen(false)
        setIdeaLogOpen(false)
      } catch (err) {
        console.error('Failed to open mobile app as project:', err)
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

  const { handleWordVomitToRalph, handleWordVomitToApp, handleWordVomitToProject } =
    useWordVomitHandlers({
      handleOpenKanban,
      loadProjects,
      setWordVomitPrdForApp,
      setAppBuilderOpen,
      setSettingsOpen,
      setKanbanOpen,
      setActiveProjectId,
      setIdeaLogOpen,
    })

  const { handleIdeaBuildAsApp, handleIdeaSendToBacklog, handleIdeaWorkInTerminal } =
    useIdeaHandlers({
      handleOpenKanban,
      loadProjects,
      setWordVomitPrdForApp,
      setAppBuilderOpen,
      setSettingsOpen,
      setKanbanOpen,
      setActiveProjectId,
      setIdeaLogOpen,
    })

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

  // After sidebar collapse/expand transition completes, fire resize
  const sidebarMountedRef = useRef(false)
  useEffect(() => {
    if (!sidebarMountedRef.current) {
      sidebarMountedRef.current = true
      return
    }
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
    return () => clearTimeout(t)
  }, [sidebarCollapsed])

  // Run terminal commands dispatched from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const command = (e as CustomEvent).detail as string
      if (!activeProjectId) return
      gridRefsRef.current.get(activeProjectId)?.current?.runCommand(command)
    }
    window.addEventListener('terminal:run-command', handler)
    return () => window.removeEventListener('terminal:run-command', handler)
  }, [activeProjectId])

  useAppKeyboard({
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
  })

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
          <KanbanPage
            projects={projects}
            onOpenTicketAsProject={handleOpenTicketAsProject}
            ticketPrdGen={prdGen.ticketPrd}
            onStartTicketPrdGen={prdGen.startTicketPrdGen}
            onClearTicketPrdGen={prdGen.clearTicketPrd}
          />
        </React.Suspense>
      )}
      {appBuilderOpen && !settingsOpen && !kanbanOpen && (
        <React.Suspense fallback={null}>
          <AppBuilderPage
            onEditAndPreview={handleEditAndPreview}
            initialPrdContent={wordVomitPrdForApp}
            onConsumeInitialPrd={() => setWordVomitPrdForApp(null)}
            mobilePrdGen={prdGen.mobilePrd}
            onStartMobilePrdGen={prdGen.startMobilePrdGen}
            onClearMobilePrdGen={prdGen.clearMobilePrd}
          />
        </React.Suspense>
      )}
      {ideaLogOpen && !settingsOpen && !kanbanOpen && !appBuilderOpen && (
        <React.Suspense fallback={null}>
          <IdeaLogPage
            projects={projects}
            onOpenFolder={handleOpenFolder}
            onBuildAsApp={handleIdeaBuildAsApp}
            onSendToBacklog={handleIdeaSendToBacklog}
            onWorkInTerminal={handleIdeaWorkInTerminal}
          />
        </React.Suspense>
      )}
      {!settingsOpen && !kanbanOpen && !appBuilderOpen && !ideaLogOpen && projects.length === 0 && (
        <EmptyState
          onOpenFolder={handleOpenFolder}
          onCreateProject={handleCreateProject}
          projects={projects}
          onSelectProject={handleSelectProject}
          onOpenKanban={handleOpenKanban}
          onOpenAppBuilder={handleOpenAppBuilder}
          onWordVomitToRalph={handleWordVomitToRalph}
          onWordVomitToApp={handleWordVomitToApp}
          onWordVomitToProject={handleWordVomitToProject}
          wordVomitGen={prdGen.wordVomit}
          onStartWordVomitGen={prdGen.startWordVomitGen}
          onClearWordVomitGen={prdGen.clearWordVomit}
        />
      )}
      {!settingsOpen &&
        !kanbanOpen &&
        !appBuilderOpen &&
        !ideaLogOpen &&
        projects.length > 0 &&
        !activeProject && (
          <EmptyState
            onOpenFolder={handleOpenFolder}
            onCreateProject={handleCreateProject}
            projects={projects}
            onSelectProject={handleSelectProject}
            onOpenKanban={handleOpenKanban}
            onOpenAppBuilder={handleOpenAppBuilder}
            onWordVomitToRalph={handleWordVomitToRalph}
            onWordVomitToApp={handleWordVomitToApp}
            onWordVomitToProject={handleWordVomitToProject}
            wordVomitGen={prdGen.wordVomit}
            onStartWordVomitGen={prdGen.startWordVomitGen}
            onClearWordVomitGen={prdGen.clearWordVomit}
          />
        )}
      {projects.map((p) =>
        p.type === 'mobile' ? (
          <React.Suspense key={p.id} fallback={null}>
            <MobileWorkspace
              project={p}
              app={mobileApps.find((a) => a.id === p.mobileAppId) ?? null}
              isVisible={
                p.id === activeProjectId &&
                !settingsOpen &&
                !kanbanOpen &&
                !appBuilderOpen &&
                !ideaLogOpen
              }
              onStartApp={startApp}
              onStopApp={stopApp}
            />
          </React.Suspense>
        ) : (
          <ProjectWorkspace
            key={p.id}
            project={p}
            palette={palette}
            gridRef={getGridRef(p.id)}
            isVisible={
              p.id === activeProjectId &&
              !settingsOpen &&
              !kanbanOpen &&
              !appBuilderOpen &&
              !ideaLogOpen
            }
            getPortOwner={getPortOwner}
            registerPort={registerPort}
            unregisterPort={unregisterPort}
          />
        ),
      )}
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
          ideaLogOpen={ideaLogOpen}
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
          onOpenIdeaLog={handleOpenIdeaLog}
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
      <PrdGenerationIndicator isGenerating={prdGen.isAnyGenerating} />
      <ToastContainer activeProjectId={activeProjectId} onFocusProject={handleSelectProject} />
    </div>
  )
}
