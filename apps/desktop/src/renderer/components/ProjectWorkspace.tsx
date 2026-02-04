import type { Ref } from 'react'
import type { Project } from '@shared/types'
import { TerminalGrid } from './TerminalGrid'
import type { TerminalGridHandle } from './TerminalGrid'
import '../styles/ProjectWorkspace.css'

interface ProjectWorkspaceProps {
  project: Project
  palette: string
  gridRef?: Ref<TerminalGridHandle>
}

export default function ProjectWorkspace({ project, palette, gridRef }: ProjectWorkspaceProps) {
  return (
    <div className="workspace">
      <TerminalGrid ref={gridRef} projectId={project.id} cwd={project.path} palette={palette} />
    </div>
  )
}
