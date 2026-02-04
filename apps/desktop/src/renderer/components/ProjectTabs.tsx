import type { Project, ClaudeStatusMap } from '@shared/types'
import '../styles/ProjectTabs.css'

interface ProjectTabsProps {
  projects: Project[]
  activeProjectId: string | null
  claudeStatus: ClaudeStatusMap
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
  claudeStatus,
  onSelectProject,
  onRemoveProject,
}: ProjectTabsProps) {
  if (projects.length === 0) return null

  return (
    <div className="project-tabs">
      {projects.map((project) => {
        const cStatus = claudeStatus[project.id]
        const isGenerating = cStatus === 'generating'
        const isWaiting = cStatus === 'waiting' || project.status === 'done'

        return (
          <div
            key={project.id}
            className={`project-tab${activeProjectId === project.id ? ' project-tab--active' : ''}${isWaiting ? ' project-tab--done' : ''}${isGenerating ? ' project-tab--generating' : ''}`}
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
            {isGenerating && <span className="project-tab-spinner" title="Generating" />}
            {isWaiting && <span className="project-tab-done-dot" title="Waiting for input" />}
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
            {isGenerating && <div className="project-tab-claude-bar" />}
          </div>
        )
      })}
    </div>
  )
}
