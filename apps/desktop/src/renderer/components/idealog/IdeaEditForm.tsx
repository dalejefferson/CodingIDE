import React from 'react'
import type { Idea, Project } from '@shared/types'

interface IdeaEditFormProps {
  idea: Idea
  editTitle: string
  editDescription: string
  editProjectId: string | null
  editPriority: string | null
  projects: Project[]
  onEditTitleChange: (value: string) => void
  onEditDescriptionChange: (value: string) => void
  onEditProjectIdChange: (value: string | null) => void
  onEditPriorityChange: (value: string | null) => void
  onSave: () => void
  onCancel: () => void
  onInputKeyDown: (e: React.KeyboardEvent) => void
  onTextareaKeyDown: (e: React.KeyboardEvent) => void
}

export const IdeaEditForm = React.memo(function IdeaEditForm({
  idea,
  editTitle,
  editDescription,
  editProjectId,
  editPriority,
  projects,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditProjectIdChange,
  onEditPriorityChange,
  onSave,
  onCancel,
  onInputKeyDown,
  onTextareaKeyDown,
}: IdeaEditFormProps) {
  return (
    <div key={idea.id} className="idea-log__form idea-log__form--edit">
      <input
        className="idea-log__input"
        type="text"
        value={editTitle}
        onChange={(e) => onEditTitleChange(e.target.value)}
        onKeyDown={onInputKeyDown}
        autoFocus
      />
      <textarea
        className="idea-log__textarea"
        value={editDescription}
        onChange={(e) => onEditDescriptionChange(e.target.value)}
        onKeyDown={onTextareaKeyDown}
        rows={3}
      />
      <div className="idea-log__form-footer">
        <div className="idea-log__form-selects">
          <select
            className="idea-log__select"
            value={editProjectId ?? ''}
            onChange={(e) => onEditProjectIdChange(e.target.value || null)}
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
            value={editPriority ?? ''}
            onChange={(e) => onEditPriorityChange(e.target.value || null)}
          >
            <option value="">No priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="idea-log__form-buttons">
          <button className="idea-log__btn idea-log__btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="idea-log__btn idea-log__btn--primary"
            onClick={onSave}
            disabled={!editTitle.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
})
