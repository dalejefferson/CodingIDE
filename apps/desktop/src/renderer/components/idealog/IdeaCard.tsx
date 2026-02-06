import React from 'react'
import type { Idea } from '@shared/types'

interface IdeaCardProps {
  idea: Idea
  showProjectBadge: boolean
  isDragging: boolean
  projectName: string | null
  dragProps: Record<string, unknown>
  onStartEdit: (id: string) => void
  onDelete: (id: string) => void
  onBuildAsApp?: (idea: Idea) => void
  onSendToBacklog?: (idea: Idea) => void
  onWorkInTerminal?: (idea: Idea) => void
}

export const IdeaCard = React.memo(function IdeaCard({
  idea,
  showProjectBadge,
  isDragging,
  projectName,
  dragProps,
  onStartEdit,
  onDelete,
  onBuildAsApp,
  onSendToBacklog,
  onWorkInTerminal,
}: IdeaCardProps) {
  return (
    <div
      key={idea.id}
      className={`idea-log__card${isDragging ? ' idea-log__card--dragging' : ''}`}
      {...dragProps}
    >
      <div className="idea-log__card-handle">
        <div className="idea-log__card-handle-row">
          <span className="idea-log__card-handle-dot" />
          <span className="idea-log__card-handle-dot" />
        </div>
        <div className="idea-log__card-handle-row">
          <span className="idea-log__card-handle-dot" />
          <span className="idea-log__card-handle-dot" />
        </div>
        <div className="idea-log__card-handle-row">
          <span className="idea-log__card-handle-dot" />
          <span className="idea-log__card-handle-dot" />
        </div>
      </div>
      <div className="idea-log__card-content">
        <h3 className="idea-log__card-title">{idea.title}</h3>
        {idea.description && <p className="idea-log__card-desc">{idea.description}</p>}
        <div className="idea-log__card-badges">
          {showProjectBadge && idea.projectId && (
            <span className="idea-log__card-project">
              {projectName ?? 'Unknown project'}
            </span>
          )}
          {idea.priority && (
            <span className={`idea-log__card-priority idea-log__card-priority--${idea.priority}`}>
              {idea.priority}
            </span>
          )}
        </div>
      </div>
      <div className="idea-log__card-actions">
        <button
          className="idea-log__icon-btn"
          onClick={() => onStartEdit(idea.id)}
          title="Edit"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 1.5l2.5 2.5L4.5 12H2v-2.5L10 1.5z" />
          </svg>
        </button>
        <button
          className="idea-log__icon-btn"
          onClick={() => onDelete(idea.id)}
          title="Delete"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 3.5h9M5 3.5V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M9.5 3.5v7.5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3.5" />
          </svg>
        </button>
        <button
          className="idea-log__icon-btn"
          onClick={() => alert('PRD generation coming soon')}
          title="Generate PRD"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 11.5h10M4 8.5l3-6 3 6H4z" />
          </svg>
        </button>
        <span className="idea-log__card-action-divider" />
        {onBuildAsApp && (
          <button
            className="idea-log__icon-btn"
            onClick={() => onBuildAsApp(idea)}
            title="Build as app"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="1.5" width="8" height="11" rx="1.5" />
              <path d="M6 10.5h2" />
            </svg>
          </button>
        )}
        {onSendToBacklog && (
          <button
            className="idea-log__icon-btn"
            onClick={() => onSendToBacklog(idea)}
            title="Send to Ralph Loop backlog"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1.5" y="2" width="11" height="10" rx="1" />
              <path d="M1.5 5h11M5 5v7M9 5v7" />
            </svg>
          </button>
        )}
        {onWorkInTerminal && (
          <button
            className="idea-log__icon-btn"
            onClick={() => onWorkInTerminal(idea)}
            title="Work in terminal"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 4.5l3 2.5-3 2.5M7.5 10H11" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
})
