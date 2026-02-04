import React from 'react'
import type { Project, ClaudeActivityMap, ClaudeStatusMap } from '@shared/types'
import '../styles/Sidebar.css'

interface SidebarProps {
  projects: Project[]
  activeProjectId: string | null
  collapsed: boolean
  settingsOpen: boolean
  claudeActivity: ClaudeActivityMap
  claudeStatus: ClaudeStatusMap
  totalActiveClaudes: number
  onToggle: () => void
  onSelectProject: (id: string) => void
  onOpenFolder: () => void
  onRemoveProject: (id: string) => void
  onOpenSettings: () => void
  onGoHome: () => void
}

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3L5 8L10 13" />
    </svg>
  )
}

function FolderIcon({ open }: { open?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {open ? (
        <>
          <path d="M1.5 3.5h4l1 -1.5h4.5a1 1 0 0 1 1 1v2.5" />
          <path d="M1.5 5.5l1.5 6h8.5l1.5 -6h-11.5z" />
        </>
      ) : (
        <path d="M1.5 3.5h4l1 -1.5h4.5a1 1 0 0 1 1 1v7a1 1 0 0 1 -1 1h-8.5a1 1 0 0 1 -1 -1v-6.5z" />
      )}
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 1.5L3.5 9H8L7 14.5L12.5 7H8L9 1.5Z" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1L9.5 6L14 8L9.5 10L8 15L6.5 10L2 8L6.5 6L8 1Z" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 6.5L8 2L13.5 6.5V13a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V6.5Z" />
      <path d="M6 14V9h4v5" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="2" />
      <path d="M13.5 8a5.5 5.5 0 0 0-.08-.88l1.28-1a.5.5 0 0 0 .12-.64l-1.22-2.12a.5.5 0 0 0-.61-.22l-1.51.61a5.5 5.5 0 0 0-.76-.44L10.4 1.7a.5.5 0 0 0-.5-.42H7.46a.5.5 0 0 0-.5.42l-.23 1.61a5.5 5.5 0 0 0-.76.44l-1.51-.61a.5.5 0 0 0-.61.22L2.63 5.48a.5.5 0 0 0 .12.64l1.28 1A5.5 5.5 0 0 0 4 8a5.5 5.5 0 0 0 .08.88l-1.28 1a.5.5 0 0 0-.12.64l1.22 2.12a.5.5 0 0 0 .61.22l1.51-.61c.23.17.49.32.76.44l.23 1.61a.5.5 0 0 0 .5.42h2.44a.5.5 0 0 0 .5-.42l.23-1.61c.27-.12.53-.27.76-.44l1.51.61a.5.5 0 0 0 .61-.22l1.22-2.12a.5.5 0 0 0-.12-.64l-1.28-1A5.5 5.5 0 0 0 13.5 8z" />
    </svg>
  )
}

interface SidebarProjectItemProps {
  project: Project
  isActive: boolean
  claudeCount: number
  claudeStatus: string | undefined
  projectStatus: string
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

const SidebarProjectItem = React.memo(function SidebarProjectItem({
  project,
  isActive,
  claudeCount,
  claudeStatus,
  projectStatus,
  onSelect,
  onRemove,
}: SidebarProjectItemProps) {
  const isGenerating = claudeStatus === 'generating'
  const isWaiting = claudeStatus === 'waiting' || projectStatus === 'done'
  return (
    <div
      className={`sidebar-thread-item${isActive ? ' sidebar-thread-item--active' : ''}${isGenerating ? ' sidebar-thread-item--claude' : ''}${isWaiting ? ' sidebar-thread-item--done' : ''}${projectStatus === 'needs_input' ? ' sidebar-thread-item--needs-input' : ''}`}
      onClick={() => onSelect(project.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        onRemove(project.id)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(project.id)
        }
      }}
    >
      <FolderIcon open={isActive} />
      <span className="sidebar-project-name">{project.name}</span>
      {isGenerating ? (
        claudeCount > 0 ? (
          <span className="sidebar-claude-badge" title={`${claudeCount} Claude generating`}>
            {claudeCount}
          </span>
        ) : (
          <span className="sidebar-spinner" title="Generating" />
        )
      ) : isWaiting ? (
        <span className="sidebar-done-dot" title="Waiting for input" />
      ) : projectStatus === 'needs_input' ? (
        <span className="sidebar-input-dot" title="Needs input" />
      ) : null}
      <button
        type="button"
        className="sidebar-delete-btn"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(project.id)
        }}
        aria-label={`Delete ${project.name}`}
        title={`Remove ${project.name}`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3l6 6M9 3l-6 6" />
        </svg>
      </button>
      {isGenerating && <div className="sidebar-claude-bar" />}
    </div>
  )
})

function Sidebar({
  projects,
  activeProjectId,
  collapsed,
  settingsOpen,
  claudeActivity,
  claudeStatus,
  totalActiveClaudes,
  onToggle,
  onSelectProject,
  onOpenFolder,
  onRemoveProject,
  onOpenSettings,
  onGoHome,
}: SidebarProps) {
  const isHome = !activeProjectId && !settingsOpen
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
        <button className="sidebar-action-btn" type="button">
          <BoltIcon />
          <span>Automations</span>
        </button>
        <button className="sidebar-action-btn" type="button">
          <SparkleIcon />
          <span>Skills</span>
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
