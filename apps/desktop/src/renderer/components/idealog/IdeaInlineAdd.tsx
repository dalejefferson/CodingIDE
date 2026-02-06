import React, { useEffect, useRef } from 'react'
import type { Project } from '@shared/types'

interface IdeaInlineAddProps {
  quickTitle: string
  quickProjectId: string | null
  quickPriority: string | null
  showExpanded: boolean
  projects: Project[]
  onQuickTitleChange: (value: string) => void
  onQuickProjectIdChange: (value: string | null) => void
  onQuickPriorityChange: (value: string | null) => void
  onInputKeyDown: (e: React.KeyboardEvent) => void
  onQuickCreate: () => void
  onCancel: () => void
  onExpandToggle: () => void
}

export const IdeaInlineAdd = React.memo(function IdeaInlineAdd({
  quickTitle,
  quickProjectId,
  quickPriority,
  showExpanded,
  projects,
  onQuickTitleChange,
  onQuickProjectIdChange,
  onQuickPriorityChange,
  onInputKeyDown,
  onQuickCreate,
  onCancel,
  onExpandToggle,
}: IdeaInlineAddProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="idea-log__inline-add">
      <input
        ref={inputRef}
        className="idea-log__inline-add-input"
        type="text"
        placeholder="What's your idea?"
        value={quickTitle}
        onChange={(e) => onQuickTitleChange(e.target.value)}
        onKeyDown={onInputKeyDown}
        onFocus={() => !showExpanded && onExpandToggle()}
      />
      {showExpanded && (
        <div className="idea-log__inline-add-expanded">
          <div className="idea-log__inline-add-footer">
            <div className="idea-log__inline-add-selects">
              <select
                className="idea-log__select"
                value={quickProjectId ?? ''}
                onChange={(e) => onQuickProjectIdChange(e.target.value || null)}
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                className="idea-log__select"
                value={quickPriority ?? ''}
                onChange={(e) => onQuickPriorityChange(e.target.value || null)}
              >
                <option value="">No priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="idea-log__inline-add-buttons">
              <button className="idea-log__btn idea-log__btn--ghost" onClick={onCancel}>
                Cancel
              </button>
              <button
                className="idea-log__btn idea-log__btn--primary"
                onClick={onQuickCreate}
                disabled={!quickTitle.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
