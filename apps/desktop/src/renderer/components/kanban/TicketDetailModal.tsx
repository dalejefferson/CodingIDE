import { useState, useCallback, useEffect } from 'react'
import type {
  Ticket,
  Project,
  UpdateTicketRequest,
  TicketStatus,
  TicketType,
  TicketPriority,
} from '@shared/types'
import { VALID_TRANSITIONS, TICKET_TYPES, TICKET_PRIORITIES } from '@shared/types'
import { TicketPRDSection } from './TicketPRDSection'
import '../../styles/TicketDetailModal.css'

interface TicketDetailModalProps {
  ticket: Ticket
  projects: Project[]
  onClose: () => void
  onUpdate: (request: UpdateTicketRequest) => Promise<void>
  onTransition: (id: string, status: TicketStatus) => Promise<void>
  onGeneratePRD: (ticketId: string) => void
  onApprovePRD: (ticketId: string) => Promise<void>
  onOpenAsProject: (ticketId: string) => Promise<void>
  /** True when PRD generation is running for this ticket (from parent state). */
  prdGenerating?: boolean
  /** Error message from a completed-with-error generation (from parent state). */
  prdGenError?: string | null
  /** Clear the parent-level PRD generation error. */
  onClearPrdGenError?: () => void
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: 'Backlog',
  up_next: 'Up Next',
  in_review: 'In Review',
  in_progress: 'In Progress',
  in_testing: 'Testing',
  completed: 'Completed',
}

const fi = { fontFamily: 'inherit' } as const

export function TicketDetailModal({
  ticket,
  projects,
  onClose,
  onUpdate,
  onTransition,
  onGeneratePRD,
  onApprovePRD,
  onOpenAsProject,
  prdGenerating = false,
  prdGenError = null,
  onClearPrdGenError,
}: TicketDetailModalProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  // Use parent-provided generating state; fall back to local for legacy usage
  const generatingPRD = prdGenerating

  // Parent error passed through for display
  const displayPrdError = prdGenError ?? null

  // ── Edit-mode form state ──────────────────────────────────────────────
  const [title, setTitle] = useState(ticket.title)
  const [description, setDescription] = useState(ticket.description)
  const [criteria, setCriteria] = useState(ticket.acceptanceCriteria.join('\n'))
  const [type, setType] = useState<TicketType>(ticket.type)
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority)
  const [projectId, setProjectId] = useState<string | null>(ticket.projectId)

  // ── Close on Escape ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  const enterEdit = useCallback(() => {
    setTitle(ticket.title)
    setDescription(ticket.description)
    setCriteria(ticket.acceptanceCriteria.join('\n'))
    setType(ticket.type)
    setPriority(ticket.priority)
    setProjectId(ticket.projectId)
    setMode('edit')
  }, [ticket])

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const ac = criteria
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    await onUpdate({
      id: ticket.id,
      title: trimmedTitle,
      description: description.trim(),
      acceptanceCriteria: ac,
      type,
      priority,
      projectId,
    })
    setMode('view')
  }, [ticket.id, title, description, criteria, type, priority, projectId, onUpdate])

  const cancelEdit = useCallback(() => setMode('view'), [])

  const handleTransition = useCallback(
    (status: TicketStatus) => () => onTransition(ticket.id, status),
    [ticket.id, onTransition],
  )

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const nextStatuses = VALID_TRANSITIONS[ticket.status]
  const canOpenAsProject = ticket.worktreePath !== null || ticket.status === 'in_progress'

  // ── Edit mode ─────────────────────────────────────────────────────────
  if (mode === 'edit') {
    return (
      <div className="ticket-detail-overlay" onClick={handleOverlayClick}>
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
              onChange={(e) => setTitle(e.target.value)}
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
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="ticket-detail-label" style={fi}>
            Acceptance Criteria (one per line)
            <textarea
              className="ticket-detail-textarea"
              style={fi}
              rows={3}
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
            />
          </label>

          <div className="ticket-detail-row">
            <label className="ticket-detail-label" style={fi}>
              Type
              <select
                className="ticket-detail-select"
                style={fi}
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
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
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
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
              onChange={(e) => setProjectId(e.target.value || null)}
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
              onClick={cancelEdit}
            >
              Cancel
            </button>
            <button
              className="ticket-detail-btn ticket-detail-btn--primary"
              style={fi}
              onClick={handleSave}
              disabled={!title.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── View mode ─────────────────────────────────────────────────────────
  return (
    <div className="ticket-detail-overlay" onClick={handleOverlayClick}>
      <div className="ticket-detail-card" style={fi}>
        {/* Header: title + edit button */}
        <div className="ticket-detail-header">
          <h2 className="ticket-detail-title" style={fi}>
            {ticket.title}
          </h2>
          <button
            className="ticket-detail-btn ticket-detail-btn--secondary"
            style={fi}
            onClick={enterEdit}
          >
            Edit
          </button>
        </div>

        {/* Badges */}
        <div className="ticket-detail-badges">
          <span
            className={`ticket-detail-badge ticket-detail-badge--status ticket-detail-badge--${ticket.status}`}
            style={fi}
          >
            {STATUS_LABELS[ticket.status]}
          </span>
          <span className="ticket-detail-badge ticket-detail-badge--type" style={fi}>
            {ticket.type}
          </span>
          <span className="ticket-detail-badge ticket-detail-badge--priority" style={fi}>
            {ticket.priority}
          </span>
        </div>

        {/* Description */}
        {ticket.description && (
          <div className="ticket-detail-section">
            <h3 className="ticket-detail-section-title" style={fi}>
              Description
            </h3>
            <p className="ticket-detail-text" style={fi}>
              {ticket.description}
            </p>
          </div>
        )}

        {/* Acceptance Criteria */}
        {ticket.acceptanceCriteria.length > 0 && (
          <div className="ticket-detail-section">
            <h3 className="ticket-detail-section-title" style={fi}>
              Acceptance Criteria
            </h3>
            <ul className="ticket-detail-criteria">
              {ticket.acceptanceCriteria.map((item, i) => (
                <li key={i} style={fi}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* PRD */}
        <TicketPRDSection
          ticket={ticket}
          generatingPRD={generatingPRD}
          displayPrdError={displayPrdError}
          onGeneratePRD={onGeneratePRD}
          onApprovePRD={onApprovePRD}
          onClearPrdGenError={onClearPrdGenError}
        />

        {/* Transition actions */}
        {nextStatuses.length > 0 && (
          <div className="ticket-detail-section">
            <h3 className="ticket-detail-section-title" style={fi}>
              Actions
            </h3>
            <div className="ticket-detail-actions">
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  className="ticket-detail-btn ticket-detail-btn--transition"
                  style={fi}
                  onClick={handleTransition(s)}
                >
                  Move to {STATUS_LABELS[s]}
                </button>
              ))}
              {canOpenAsProject && (
                <button
                  className="ticket-detail-btn ticket-detail-btn--accent"
                  style={fi}
                  onClick={() => onOpenAsProject(ticket.id)}
                >
                  Open as Project
                </button>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {ticket.history.length > 0 && (
          <div className="ticket-detail-section">
            <h3 className="ticket-detail-section-title" style={fi}>
              History
            </h3>
            <ul className="ticket-detail-history">
              {ticket.history.map((evt, i) => (
                <li key={i} className="ticket-detail-history-item" style={fi}>
                  <span className="ticket-detail-history-time" style={fi}>
                    {fmtTime(evt.timestamp)}
                  </span>
                  <span className="ticket-detail-history-action" style={fi}>
                    {evt.action}
                    {evt.from && evt.to && (
                      <span className="ticket-detail-history-change" style={fi}>
                        {' '}
                        {evt.from} &rarr; {evt.to}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
