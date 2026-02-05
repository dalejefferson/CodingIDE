import React from 'react'
import type { Project, ClaudeStatusMap } from '@shared/types'
import { ProjectTabs } from './ProjectTabs'
import { CommandLauncher } from './CommandLauncher'
import '../styles/Toolbar.css'

interface ToolbarProps {
  projectName: string | null
  projects: Project[]
  activeProjectId: string | null
  sidebarCollapsed: boolean
  claudeStatus: ClaudeStatusMap
  onToggleSidebar: () => void
  onSelectProject: (id: string) => void
  onRemoveProject: (id: string) => void
  onRunCommand: (command: string) => void
}

function Toolbar({
  projectName,
  projects,
  activeProjectId,
  sidebarCollapsed,
  claudeStatus,
  onToggleSidebar,
  onSelectProject,
  onRemoveProject,
  onRunCommand,
}: ToolbarProps) {
  return (
    <div className={`toolbar${sidebarCollapsed ? ' toolbar--no-sidebar' : ''}`}>
      {sidebarCollapsed && (
        <button
          className="toolbar-expand-btn"
          type="button"
          onClick={onToggleSidebar}
          aria-label="Expand sidebar"
        >
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
            <path d="M6 3L11 8L6 13" />
          </svg>
        </button>
      )}
      {/* Left: always show project tabs */}
      <div className="toolbar-left">
        {projects.length > 0 ? (
          <ProjectTabs
            projects={projects}
            activeProjectId={activeProjectId}
            claudeStatus={claudeStatus}
            onSelectProject={onSelectProject}
            onRemoveProject={onRemoveProject}
          />
        ) : (
          <span className="toolbar-title">{projectName ?? 'CodingIDE'}</span>
        )}
      </div>

      {/* Right: action buttons + diff indicator */}
      <div className="toolbar-right">
        {/* Command launcher (play button) */}
        <CommandLauncher projectId={activeProjectId} onRunCommand={onRunCommand} />
      </div>
    </div>
  )
}

const MemoizedToolbar = React.memo(Toolbar)
export { MemoizedToolbar as Toolbar }
