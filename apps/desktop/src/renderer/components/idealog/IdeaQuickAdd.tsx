import React from 'react'
import type { Project } from '@shared/types'

interface IdeaQuickAddProps {
  quickInputRef: React.RefObject<HTMLInputElement>
  quickTitle: string
  quickDescription: string
  quickProjectId: string | null
  quickPriority: string | null
  showExpanded: boolean
  projects: Project[]
  onQuickTitleChange: (value: string) => void
  onQuickDescriptionChange: (value: string) => void
  onQuickProjectIdChange: (value: string | null) => void
  onQuickPriorityChange: (value: string | null) => void
  onInputKeyDown: (e: React.KeyboardEvent) => void
  onTextareaKeyDown: (e: React.KeyboardEvent) => void
  onAddBtnClick: () => void
  onQuickCreate: () => void
  onReset: () => void
  onFocusInput: () => void
}

export const IdeaQuickAdd = React.memo(function IdeaQuickAdd({
  quickInputRef,
  quickTitle,
  quickDescription,
  quickProjectId,
  quickPriority,
  showExpanded,
  projects,
  onQuickTitleChange,
  onQuickDescriptionChange,
  onQuickProjectIdChange,
  onQuickPriorityChange,
  onInputKeyDown,
  onTextareaKeyDown,
  onAddBtnClick,
  onQuickCreate,
  onReset,
  onFocusInput,
}: IdeaQuickAddProps) {
  return (
    <div className="idea-log__quick-add">
      <div className="idea-log__quick-add-row">
        <input
          ref={quickInputRef}
          className="idea-log__quick-add-input"
          type="text"
          placeholder="What's your idea?"
          value={quickTitle}
          onChange={(e) => onQuickTitleChange(e.target.value)}
          onKeyDown={onInputKeyDown}
          onFocus={() => !showExpanded && onFocusInput()}
        />
        <button className="idea-log__quick-add-btn" onClick={onAddBtnClick}>
          +
        </button>
      </div>
      {showExpanded && (
        <div className="idea-log__quick-add-expanded">
          <textarea
            className="idea-log__textarea"
            placeholder="Describe your idea (optional)..."
            value={quickDescription}
            onChange={(e) => onQuickDescriptionChange(e.target.value)}
            onKeyDown={onTextareaKeyDown}
            rows={3}
          />
          <div className="idea-log__quick-add-footer">
            <div className="idea-log__quick-add-selects">
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
            <div className="idea-log__quick-add-buttons">
              <button className="idea-log__btn idea-log__btn--ghost" onClick={onReset}>
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
