import type { Project } from '@shared/types'
import { TerminalGrid } from './TerminalGrid'
import '../styles/ProjectWorkspace.css'

interface ProjectWorkspaceProps {
  project: Project
}

export default function ProjectWorkspace({ project }: ProjectWorkspaceProps) {
  return (
    <div className="workspace">
      <TerminalGrid projectId={project.id} cwd={project.path} />
    </div>
  )
}
