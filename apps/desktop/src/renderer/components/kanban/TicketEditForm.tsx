/**
 * TicketEditForm — the edit-mode form for a ticket's editable fields.
 */

import type {
  Project,
  TicketType,
  TicketPriority,
} from '@shared/types'
import { TICKET_TYPES, TICKET_PRIORITIES } from '@shared/types'

const fi = { fontFamily: 'inherit' } as const

interface TicketEditFormProps {
  title: string
  description: string
  criteria: string
  type: TicketType
  priority: TicketPriority
  projectId: string | null
  projects: Project[]
  onTitleChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onCriteriaChange: (v: string) => void
  onTypeChange: (v: TicketType) => void
  onPriorityChange: (v: TicketPriority) => void
  onProjectIdChange: (v: string | null) => void
  onSave: () => void
  onCancel: () => void
  onOverlayClick: (e: React.MouseEvent<HTMLDivElement>) => void
}

export function TicketEditForm({
  title,
  description,
  criteria,
  type,
  priority,
  projectId,
  projects,
  onTitleChange,
  onDescriptionChange,
  onCriteriaChange,
  onTypeChange,
  onPriorityChange,
  onProjectIdChange,
  onSave,
  onCancel,
  onOverlayClick,
}: TicketEditFormProps) {
  return (
    <div className="ticket-detail-overlay" onClick={onOverlayClick}>
      <div className="ticket-detail-card" style={fi}>
        <h2 className="ticket-detail-heading" style={fi}>
          Edit Ticket
        </h2>

        <label className="ticket-detail-label" style={fi}>
          Title
          <input
            className="ticket-detail-input"
            style={fi}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            autoFocus
          />
        </label>

        <label className="ticket-detail-label" style={fi}>
          Description
          <textarea
            className="ticket-detail-textarea"
            style={fi}
            rows={4}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </label>

        <label className="ticket-detail-label" style={fi}>
          Acceptance Criteria (one per line)
          <textarea
            className="ticket-detail-textarea"
            style={fi}
            rows={3}
            value={criteria}
            onChange={(e) => onCriteriaChange(e.target.value)}
          />
        </label>

        <div className="ticket-detail-row">
          <label className="ticket-detail-label" style={fi}>
            Type
            <select
              className="ticket-detail-select"
              style={fi}
              value={type}
              onChange={(e) => onTypeChange(e.target.value as TicketType)}
            >
              {TICKET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="ticket-detail-label" style={fi}>
            Priority
            <select
              className="ticket-detail-select"
              style={fi}
              value={priority}
              onChange={(e) => onPriorityChange(e.target.value as TicketPriority)}
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="ticket-detail-label" style={fi}>
          Project
          <select
            className="ticket-detail-select"
            style={fi}
            value={projectId ?? ''}
            onChange={(e) => onProjectIdChange(e.target.value || null)}
          >
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="ticket-detail-actions">
          <button
            className="ticket-detail-btn ticket-detail-btn--secondary"
            style={fi}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="ticket-detail-btn ticket-detail-btn--primary"
            style={fi}
            onClick={onSave}
            disabled={!title.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
