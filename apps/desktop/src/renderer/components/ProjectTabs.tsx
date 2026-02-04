import type { Project } from '@shared/types'
import '../styles/ProjectTabs.css'

interface ProjectTabsProps {
  projects: Project[]
  activeProjectId: string | null
  onSelectProject: (id: string) => void
  onRemoveProject: (id: string) => void
}

function CloseIcon() {
  return (
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
  )
}

export function ProjectTabs({
  projects,
  activeProjectId,
  onSelectProject,
  onRemoveProject,
}: ProjectTabsProps) {
  if (projects.length === 0) return null

  return (
    <div className="project-tabs">
      {projects.map((project) => (
        <div
          key={project.id}
          className={`project-tab${activeProjectId === project.id ? ' project-tab--active' : ''}`}
          onClick={() => onSelectProject(project.id)}
          role="tab"
          aria-selected={activeProjectId === project.id}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelectProject(project.id)
            }
          }}
        >
          {project.status === 'running' && <span className="project-tab-spinner" title="Running" />}
          <span className="project-tab-name">{project.name}</span>
          <button
            type="button"
            className="project-tab-close"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              onRemoveProject(project.id)
            }}
            aria-label={`Close ${project.name}`}
            title={`Remove ${project.name}`}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  )
}
