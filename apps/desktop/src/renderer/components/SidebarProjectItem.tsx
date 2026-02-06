import React from 'react'
import type { Project } from '@shared/types'
import { FolderIcon } from './SidebarIcons'

interface SidebarProjectItemProps {
  project: Project
  isActive: boolean
  claudeCount: number
  claudeStatus: string | undefined
  projectStatus: string
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

export const SidebarProjectItem = React.memo(function SidebarProjectItem({
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
      {project.origin === 'ralph-loop' && (
        <span className="sidebar-ralph-badge" title="Created by Ralph Loop">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 2l4 4-4 4" />
            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
            <path d="M7 22l-4-4 4-4" />
            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
          </svg>
        </span>
      )}
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
