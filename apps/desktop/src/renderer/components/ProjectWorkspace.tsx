import type { Project } from '@shared/types'
import { TerminalGrid } from './TerminalGrid'
import '../styles/ProjectWorkspace.css'

interface ProjectWorkspaceProps {
  project: Project
  palette: string
}

export default function ProjectWorkspace({ project, palette }: ProjectWorkspaceProps) {
  return (
    <div className="workspace">
      <TerminalGrid projectId={project.id} cwd={project.path} palette={palette} />
    </div>
  )
}
