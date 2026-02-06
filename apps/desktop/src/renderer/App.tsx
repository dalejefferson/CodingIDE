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
import { useAppNavigation } from './hooks/useAppNavigation'
import { useProjectActions } from './hooks/useProjectActions'
import type { TerminalGridHandle } from './components/TerminalGrid'
import './styles/App.css'

export function App() {
  const nav = useAppNavigation()
  const pa = useProjectActions({
    focusProject: nav.focusProject,
    setActiveProjectId: nav.setActiveProjectId,
    activeProjectId: nav.activeProjectId,
  })

  const [wordVomitPrdForApp, setWordVomitPrdForApp] = useState<string | null>(null)
  const activeProject = pa.projects.find((p) => p.id === nav.activeProjectId) ?? null
  const gridRefsRef = useRef(new Map<string, React.RefObject<TerminalGridHandle>>())

  const activeProjectIdRef = useRef(nav.activeProjectId)
  activeProjectIdRef.current = nav.activeProjectId
  const projectsRef = useRef(pa.projects)
  projectsRef.current = pa.projects

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

  const { handleWordVomitToRalph, handleWordVomitToApp, handleWordVomitToProject } =
    useWordVomitHandlers({
      handleOpenKanban: nav.handleOpenKanban,
      loadProjects: pa.loadProjects,
      setWordVomitPrdForApp,
      setAppBuilderOpen: nav.setAppBuilderOpen,
      setSettingsOpen: nav.setSettingsOpen,
      setKanbanOpen: nav.setKanbanOpen,
      setActiveProjectId: nav.setActiveProjectId,
      setIdeaLogOpen: nav.setIdeaLogOpen,
    })

  const { handleIdeaBuildAsApp, handleIdeaSendToBacklog, handleIdeaWorkInTerminal } =
    useIdeaHandlers({
      handleOpenKanban: nav.handleOpenKanban,
      loadProjects: pa.loadProjects,
      setWordVomitPrdForApp,
      setAppBuilderOpen: nav.setAppBuilderOpen,
      setSettingsOpen: nav.setSettingsOpen,
      setKanbanOpen: nav.setKanbanOpen,
      setActiveProjectId: nav.setActiveProjectId,
      setIdeaLogOpen: nav.setIdeaLogOpen,
    })

  // Collapse sidebar when browser pane opens
  useEffect(() => {
    const handler = () => nav.setSidebarCollapsed(true)
    window.addEventListener('sidebar:collapse', handler)
    return () => window.removeEventListener('sidebar:collapse', handler)
  }, [nav])

  // After sidebar collapse/expand transition, fire resize
  useEffect(() => {
    if (!pa.sidebarMountedRef.current) { pa.sidebarMountedRef.current = true; return }
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
    return () => clearTimeout(t)
  }, [nav.sidebarCollapsed, pa.sidebarMountedRef])

  // Run terminal commands dispatched from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const command = (e as CustomEvent).detail as string
      if (!nav.activeProjectId) return
      gridRefsRef.current.get(nav.activeProjectId)?.current?.runCommand(command)
    }
    window.addEventListener('terminal:run-command', handler)
    return () => window.removeEventListener('terminal:run-command', handler)
  }, [nav.activeProjectId])

  useAppKeyboard({
    cyclePalette,
    cycleFont,
    toggleSidebar: nav.toggleSidebar,
    handleOpenFolder: pa.handleOpenFolder,
    projectsRef,
    activeProjectIdRef,
    setActiveProjectId: nav.setActiveProjectId,
    setSettingsOpen: nav.setSettingsOpen,
    setKanbanOpen: nav.setKanbanOpen,
    setAppBuilderOpen: nav.setAppBuilderOpen,
    setIdeaLogOpen: nav.setIdeaLogOpen,
  })

  const totalActiveClaudes = useMemo(
    () => Object.values(pa.claudeActivity).reduce((sum, n) => sum + n, 0),
    [pa.claudeActivity],
  )

  const handleRunCommand = useCallback(
    (command: string) => {
      if (!nav.activeProjectId) return
      gridRefsRef.current.get(nav.activeProjectId)?.current?.runCommand(command)
    },
    [nav.activeProjectId],
  )

  const handleRemoveProject = useCallback(
    async (id: string) => {
      await pa.handleRemoveProject(id)
      gridRefsRef.current.delete(id)
    },
    [pa],
  )

  const noPanel = !nav.settingsOpen && !nav.kanbanOpen && !nav.appBuilderOpen && !nav.ideaLogOpen
  const isProjectVisible = (pId: string) =>
    pId === nav.activeProjectId && noPanel

  const mainContent = (
    <>
      {nav.settingsOpen && (
        <React.Suspense fallback={null}>
          <SettingsPage palette={palette} font={font} onSelectPalette={setPalette} onSelectFont={setFont} />
        </React.Suspense>
      )}
      {nav.kanbanOpen && !nav.settingsOpen && (
        <React.Suspense fallback={null}>
          <KanbanPage
            projects={pa.projects}
            onOpenTicketAsProject={pa.handleOpenTicketAsProject}
            ticketPrdGen={prdGen.ticketPrd}
            onStartTicketPrdGen={prdGen.startTicketPrdGen}
            onClearTicketPrdGen={prdGen.clearTicketPrd}
          />
        </React.Suspense>
      )}
      {nav.appBuilderOpen && !nav.settingsOpen && !nav.kanbanOpen && (
        <React.Suspense fallback={null}>
          <AppBuilderPage
            onEditAndPreview={pa.handleEditAndPreview}
            initialPrdContent={wordVomitPrdForApp}
            onConsumeInitialPrd={() => setWordVomitPrdForApp(null)}
            mobilePrdGen={prdGen.mobilePrd}
            onStartMobilePrdGen={prdGen.startMobilePrdGen}
            onClearMobilePrdGen={prdGen.clearMobilePrd}
          />
        </React.Suspense>
      )}
      {nav.ideaLogOpen && !nav.settingsOpen && !nav.kanbanOpen && !nav.appBuilderOpen && (
        <React.Suspense fallback={null}>
          <IdeaLogPage
            projects={pa.projects}
            onOpenFolder={pa.handleOpenFolder}
            onBuildAsApp={handleIdeaBuildAsApp}
            onSendToBacklog={handleIdeaSendToBacklog}
            onWorkInTerminal={handleIdeaWorkInTerminal}
          />
        </React.Suspense>
      )}
      {noPanel && !activeProject && (
        <EmptyState
          onOpenFolder={pa.handleOpenFolder}
          onCreateProject={pa.handleCreateProject}
          projects={pa.projects}
          onSelectProject={nav.handleSelectProject}
          onOpenKanban={nav.handleOpenKanban}
          onOpenAppBuilder={nav.handleOpenAppBuilder}
          onWordVomitToRalph={handleWordVomitToRalph}
          onWordVomitToApp={handleWordVomitToApp}
          onWordVomitToProject={handleWordVomitToProject}
          wordVomitGen={prdGen.wordVomit}
          onStartWordVomitGen={prdGen.startWordVomitGen}
          onClearWordVomitGen={prdGen.clearWordVomit}
        />
      )}
      {pa.projects.map((p) =>
        p.type === 'mobile' ? (
          <React.Suspense key={p.id} fallback={null}>
            <MobileWorkspace
              project={p}
              app={mobileApps.find((a) => a.id === p.mobileAppId) ?? null}
              isVisible={isProjectVisible(p.id)}
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
            isVisible={isProjectVisible(p.id)}
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
      <div className={`sidebar-wrapper${nav.sidebarCollapsed ? ' sidebar-wrapper--collapsed' : ''}`}>
        <Sidebar
          projects={pa.projects}
          activeProjectId={nav.activeProjectId}
          collapsed={nav.sidebarCollapsed}
          settingsOpen={nav.settingsOpen}
          kanbanOpen={nav.kanbanOpen}
          appBuilderOpen={nav.appBuilderOpen}
          ideaLogOpen={nav.ideaLogOpen}
          claudeActivity={pa.claudeActivity}
          claudeStatus={pa.claudeStatus}
          totalActiveClaudes={totalActiveClaudes}
          onToggle={nav.toggleSidebar}
          onSelectProject={nav.handleSelectProject}
          onOpenFolder={pa.handleOpenFolder}
          onRemoveProject={handleRemoveProject}
          onOpenSettings={nav.toggleSettings}
          onGoHome={nav.handleGoHome}
          onOpenKanban={nav.handleOpenKanban}
          onOpenAppBuilder={nav.handleOpenAppBuilder}
          onOpenIdeaLog={nav.handleOpenIdeaLog}
        />
      </div>
      <div className="main-pane">
        <Toolbar
          projectName={activeProject?.name ?? null}
          projects={pa.projects}
          activeProjectId={nav.activeProjectId}
          sidebarCollapsed={nav.sidebarCollapsed}
          claudeStatus={pa.claudeStatus}
          onToggleSidebar={nav.toggleSidebar}
          onSelectProject={nav.handleSelectProject}
          onRemoveProject={handleRemoveProject}
          onRunCommand={handleRunCommand}
        />
        <div className="main-content">{mainContent}</div>
      </div>
      <PrdGenerationIndicator isGenerating={prdGen.isAnyGenerating} />
      <ToastContainer activeProjectId={nav.activeProjectId} onFocusProject={nav.handleSelectProject} />
    </div>
  )
}
