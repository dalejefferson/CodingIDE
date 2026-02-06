import { useState, useCallback, useEffect } from 'react'
import type {
  Ticket,
  Project,
  UpdateTicketRequest,
  TicketStatus,
  TicketType,
  TicketPriority,
} from '@shared/types'
import { VALID_TRANSITIONS } from '@shared/types'
import { TicketPRDSection } from './TicketPRDSection'
import { TicketEditForm } from './TicketEditForm'
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
  prdGenerating?: boolean
  prdGenError?: string | null
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
  const [title, setTitle] = useState(ticket.title)
  const [description, setDescription] = useState(ticket.description)
  const [criteria, setCriteria] = useState(ticket.acceptanceCriteria.join('\n'))
  const [type, setType] = useState<TicketType>(ticket.type)
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority)
  const [projectId, setProjectId] = useState<string | null>(ticket.projectId)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose() },
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
    const ac = criteria.split('\n').map((l) => l.trim()).filter(Boolean)
    await onUpdate({ id: ticket.id, title: trimmedTitle, description: description.trim(), acceptanceCriteria: ac, type, priority, projectId })
    setMode('view')
  }, [ticket.id, title, description, criteria, type, priority, projectId, onUpdate])

  const handleTransition = useCallback(
    (status: TicketStatus) => () => onTransition(ticket.id, status),
    [ticket.id, onTransition],
  )

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const nextStatuses = VALID_TRANSITIONS[ticket.status]
  const canOpenAsProject = ticket.worktreePath !== null || ticket.status === 'in_progress'

  if (mode === 'edit') {
    return (
      <TicketEditForm
        title={title}
        description={description}
        criteria={criteria}
        type={type}
        priority={priority}
        projectId={projectId}
        projects={projects}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onCriteriaChange={setCriteria}
        onTypeChange={setType}
        onPriorityChange={setPriority}
        onProjectIdChange={setProjectId}
        onSave={handleSave}
        onCancel={() => setMode('view')}
        onOverlayClick={handleOverlayClick}
      />
    )
  }

  return (
    <div className="ticket-detail-overlay" onClick={handleOverlayClick}>
      <div className="ticket-detail-card" style={fi}>
        <div className="ticket-detail-header">
          <h2 className="ticket-detail-title" style={fi}>{ticket.title}</h2>
          <button className="ticket-detail-btn ticket-detail-btn--secondary" style={fi} onClick={enterEdit}>
            Edit
          </button>
        </div>

        <div className="ticket-detail-badges">
          <span className={`ticket-detail-badge ticket-detail-badge--status ticket-detail-badge--${ticket.status}`} style={fi}>
            {STATUS_LABELS[ticket.status]}
          </span>
          <span className="ticket-detail-badge ticket-detail-badge--type" style={fi}>{ticket.type}</span>
          <span className="ticket-detail-badge ticket-detail-badge--priority" style={fi}>{ticket.priority}</span>
        </div>

        {ticket.description && (
          <div className="ticket-detail-section">
            <h3 className="ticket-detail-section-title" style={fi}>Description</h3>
            <p className="ticket-detail-text" style={fi}>{ticket.description}</p>
          </div>
        )}

        {ticket.acceptanceCriteria.length > 0 && (
          <div className="ticket-detail-section">
            <h3 className="ticket-detail-section-title" style={fi}>Acceptance Criteria</h3>
            <ul className="ticket-detail-criteria">
              {ticket.acceptanceCriteria.map((item, i) => <li key={i} style={fi}>{item}</li>)}
            </ul>
          </div>
        )}

        <TicketPRDSection
          ticket={ticket}
          generatingPRD={prdGenerating}
          displayPrdError={prdGenError ?? null}
          onGeneratePRD={onGeneratePRD}
          onApprovePRD={onApprovePRD}
          onClearPrdGenError={onClearPrdGenError}
        />

        {nextStatuses.length > 0 && (
          <div className="ticket-detail-section">
            <h3 className="ticket-detail-section-title" style={fi}>Actions</h3>
            <div className="ticket-detail-actions">
              {nextStatuses.map((s) => (
                <button key={s} className="ticket-detail-btn ticket-detail-btn--transition" style={fi} onClick={handleTransition(s)}>
                  Move to {STATUS_LABELS[s]}
                </button>
              ))}
              {canOpenAsProject && (
                <button className="ticket-detail-btn ticket-detail-btn--accent" style={fi} onClick={() => onOpenAsProject(ticket.id)}>
                  Open as Project
                </button>
              )}
            </div>
          </div>
        )}

        {ticket.history.length > 0 && (
          <div className="ticket-detail-section">
            <h3 className="ticket-detail-section-title" style={fi}>History</h3>
            <ul className="ticket-detail-history">
              {ticket.history.map((evt, i) => (
                <li key={i} className="ticket-detail-history-item" style={fi}>
                  <span className="ticket-detail-history-time" style={fi}>{fmtTime(evt.timestamp)}</span>
                  <span className="ticket-detail-history-action" style={fi}>
                    {evt.action}
                    {evt.from && evt.to && (
                      <span className="ticket-detail-history-change" style={fi}> {evt.from} &rarr; {evt.to}</span>
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
