import React from 'react'
import type { Project, ClaudeActivityMap, ClaudeStatusMap } from '@shared/types'
import {
  LoopIcon,
  PhoneIcon,
  LightbulbIcon,
  ChevronLeftIcon,
  PlusIcon,
  HomeIcon,
  GearIcon,
} from './SidebarIcons'
import { SidebarProjectItem } from './SidebarProjectItem'
import '../styles/Sidebar.css'

interface SidebarProps {
  projects: Project[]
  activeProjectId: string | null
  collapsed: boolean
  settingsOpen: boolean
  kanbanOpen: boolean
  appBuilderOpen: boolean
  ideaLogOpen: boolean
  claudeActivity: ClaudeActivityMap
  claudeStatus: ClaudeStatusMap
  totalActiveClaudes: number
  onToggle: () => void
  onSelectProject: (id: string) => void
  onOpenFolder: () => void
  onRemoveProject: (id: string) => void
  onOpenSettings: () => void
  onGoHome: () => void
  onOpenKanban: () => void
  onOpenAppBuilder: () => void
  onOpenIdeaLog: () => void
}

function Sidebar({
  projects,
  activeProjectId,
  collapsed,
  settingsOpen,
  kanbanOpen,
  appBuilderOpen,
  ideaLogOpen,
  claudeActivity,
  claudeStatus,
  totalActiveClaudes,
  onToggle,
  onSelectProject,
  onOpenFolder,
  onRemoveProject,
  onOpenSettings,
  onGoHome,
  onOpenKanban,
  onOpenAppBuilder,
  onOpenIdeaLog,
}: SidebarProps) {
  const isHome = !activeProjectId && !settingsOpen && !kanbanOpen && !appBuilderOpen && !ideaLogOpen
  return (
    <aside className="sidebar" aria-label="Sidebar" aria-hidden={collapsed}>
      <div className="sidebar-drag-region">
        <button
          className={`sidebar-toggle${collapsed ? ' sidebar-toggle--collapsed' : ''}`}
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          tabIndex={collapsed ? -1 : 0}
        >
          <ChevronLeftIcon />
        </button>
      </div>

      <div className="sidebar-actions">
        <button
          className={`sidebar-action-btn${isHome ? ' sidebar-action-btn--active' : ''}`}
          type="button"
          onClick={onGoHome}
          aria-label="Home Page"
        >
          <HomeIcon />
          <span>Home Page</span>
        </button>
        <button
          className={`sidebar-action-btn${kanbanOpen ? ' sidebar-action-btn--active' : ''}`}
          type="button"
          onClick={onOpenKanban}
          aria-label="Ralph Loop"
        >
          <LoopIcon />
          <span>Ralph Loop</span>
        </button>
        <button
          className={`sidebar-action-btn${appBuilderOpen ? ' sidebar-action-btn--active' : ''}`}
          type="button"
          onClick={onOpenAppBuilder}
          aria-label="App Builder"
        >
          <PhoneIcon />
          <span>App Builder</span>
        </button>
        <button
          className={`sidebar-action-btn${ideaLogOpen ? ' sidebar-action-btn--active' : ''}`}
          type="button"
          onClick={onOpenIdeaLog}
          aria-label="Idea Log"
        >
          <LightbulbIcon />
          <span>Idea Log</span>
        </button>
      </div>

      <div className="sidebar-section-label">
        <span>Projects</span>
        {totalActiveClaudes > 0 && (
          <span
            className="sidebar-claude-counter"
            title={`${totalActiveClaudes} Claude instance${totalActiveClaudes !== 1 ? 's' : ''} active`}
          >
            {totalActiveClaudes}
          </span>
        )}
        <button
          className="sidebar-section-add-btn"
          type="button"
          onClick={onOpenFolder}
          aria-label="Open folder"
          title="Open folder"
        >
          <PlusIcon />
        </button>
      </div>

      <nav className="sidebar-thread-list">
        {projects.length === 0 && <span className="sidebar-empty-hint">No projects yet</span>}
        {projects.map((project) => (
          <SidebarProjectItem
            key={project.id}
            project={project}
            isActive={activeProjectId === project.id}
            claudeCount={claudeActivity[project.id] ?? 0}
            claudeStatus={claudeStatus[project.id]}
            projectStatus={project.status}
            onSelect={onSelectProject}
            onRemove={onRemoveProject}
          />
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          className={`sidebar-action-btn${settingsOpen ? ' sidebar-action-btn--active' : ''}`}
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          <GearIcon />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}

const MemoizedSidebar = React.memo(Sidebar)
export { MemoizedSidebar as Sidebar }
