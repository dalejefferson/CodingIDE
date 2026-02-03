import type { Project } from '@shared/types'
import '../styles/ProjectWorkspace.css'

interface ProjectWorkspaceProps {
  project: Project
}

const STATUS_LABELS: Record<Project['status'], string> = {
  idle: 'Idle',
  running: 'Running',
  done: 'Done',
  needs_input: 'Needs input',
}

function FolderLargeIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="workspace-icon"
    >
      <path d="M4 8h8l2.5 -3h9.5a2 2 0 0 1 2 2v16a2 2 0 0 1 -2 2h-18a2 2 0 0 1 -2 -2v-15z" />
    </svg>
  )
}

export default function ProjectWorkspace({ project }: ProjectWorkspaceProps) {
  return (
    <div className="workspace">
      <FolderLargeIcon />
      <h2 className="workspace-name">{project.name}</h2>
      <p className="workspace-path">{project.path}</p>
      <span className={`workspace-status workspace-status--${project.status}`}>
        {STATUS_LABELS[project.status]}
      </span>
    </div>
  )
}
