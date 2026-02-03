import type { Project } from '@shared/types'
import '../styles/Sidebar.css'

interface SidebarProps {
  projects: Project[]
  activeProjectId: string | null
  onSelectProject: (id: string) => void
  onOpenFolder: () => void
  onRemoveProject: (id: string) => void
}

function FolderIcon() {
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
      <path d="M1.5 3.5h4l1 -1.5h4.5a1 1 0 0 1 1 1v7a1 1 0 0 1 -1 1h-8.5a1 1 0 0 1 -1 -1v-6.5z" />
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

const STATUS_LABELS: Record<Project['status'], string> = {
  idle: 'Idle',
  running: 'Running',
  done: 'Done',
  needs_input: 'Needs input',
}

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onOpenFolder,
  onRemoveProject,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-drag-region" />

      <div className="sidebar-actions">
        <button className="sidebar-action-btn" type="button" onClick={onOpenFolder}>
          <PlusIcon />
          <span>Open folder</span>
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

      <div className="sidebar-section-label">Projects</div>

      <nav className="sidebar-thread-list">
        {projects.length === 0 && <span className="sidebar-empty-hint">No projects yet</span>}
        {projects.map((project) => (
          <button
            key={project.id}
            className={`sidebar-thread-item${activeProjectId === project.id ? ' sidebar-thread-item--active' : ''}`}
            type="button"
            onClick={() => onSelectProject(project.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              onRemoveProject(project.id)
            }}
          >
            <FolderIcon />
            <span className="sidebar-project-name">{project.name}</span>
            <span className={`sidebar-status sidebar-status--${project.status}`}>
              {STATUS_LABELS[project.status]}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
