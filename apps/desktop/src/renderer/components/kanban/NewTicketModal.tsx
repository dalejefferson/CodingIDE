import { useState, useCallback, useRef, useEffect } from 'react'
import type { Project, CreateTicketRequest, TicketType, TicketPriority } from '@shared/types'
import { TICKET_TYPES, TICKET_PRIORITIES } from '@shared/types'
import '../../styles/NewTicketModal.css'

interface NewTicketModalProps {
  projects: Project[]
  onSubmit: (request: CreateTicketRequest) => Promise<void>
  onClose: () => void
}

export function NewTicketModal({ projects, onSubmit, onClose }: NewTicketModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [acceptanceCriteriaText, setAcceptanceCriteriaText] = useState('')
  const [type, setType] = useState<TicketType>('feature')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Auto-focus title on mount
  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) {
        onClose()
      }
    },
    [onClose],
  )

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !submitting

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!canSubmit) return

      setSubmitting(true)

      const acceptanceCriteria = acceptanceCriteriaText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      const request: CreateTicketRequest = {
        title: title.trim(),
        description: description.trim(),
        acceptanceCriteria,
        type,
        priority,
        projectId,
      }

      try {
        await onSubmit(request)
      } finally {
        setSubmitting(false)
      }
    },
    [canSubmit, title, description, acceptanceCriteriaText, type, priority, projectId, onSubmit],
  )

  return (
    <div
      ref={overlayRef}
      className="new-ticket-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="new-ticket-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create new ticket"
        style={{ fontFamily: 'inherit' }}
      >
        <h2 className="new-ticket-heading" style={{ fontFamily: 'inherit' }}>
          New Ticket
        </h2>

        <form onSubmit={handleSubmit} className="new-ticket-form">
          {/* Title */}
          <label className="new-ticket-label" style={{ fontFamily: 'inherit' }}>
            Title
            <input
              ref={titleRef}
              type="text"
              className="new-ticket-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the work"
              required
              style={{ fontFamily: 'inherit' }}
            />
          </label>

          {/* Description */}
          <label className="new-ticket-label" style={{ fontFamily: 'inherit' }}>
            Description
            <textarea
              className="new-ticket-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done and why"
              rows={4}
              required
              style={{ fontFamily: 'inherit' }}
            />
          </label>

          {/* Acceptance Criteria */}
          <label className="new-ticket-label" style={{ fontFamily: 'inherit' }}>
            Acceptance Criteria
            <textarea
              className="new-ticket-textarea"
              value={acceptanceCriteriaText}
              onChange={(e) => setAcceptanceCriteriaText(e.target.value)}
              placeholder="One criterion per line"
              rows={3}
              style={{ fontFamily: 'inherit' }}
            />
          </label>

          {/* Dropdowns row */}
          <div className="new-ticket-dropdowns">
            {/* Type */}
            <label className="new-ticket-label" style={{ fontFamily: 'inherit' }}>
              Type
              <select
                className="new-ticket-select"
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                style={{ fontFamily: 'inherit' }}
              >
                {TICKET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            {/* Priority */}
            <label className="new-ticket-label" style={{ fontFamily: 'inherit' }}>
              Priority
              <select
                className="new-ticket-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                style={{ fontFamily: 'inherit' }}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            {/* Project */}
            <label className="new-ticket-label" style={{ fontFamily: 'inherit' }}>
              Project
              <select
                className="new-ticket-select"
                value={projectId ?? ''}
                onChange={(e) => setProjectId(e.target.value || null)}
                style={{ fontFamily: 'inherit' }}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Actions */}
          <div className="new-ticket-actions">
            <button
              type="button"
              className="new-ticket-btn new-ticket-btn-cancel"
              onClick={onClose}
              disabled={submitting}
              style={{ fontFamily: 'inherit' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="new-ticket-btn new-ticket-btn-submit"
              disabled={!canSubmit}
              style={{ fontFamily: 'inherit' }}
            >
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
