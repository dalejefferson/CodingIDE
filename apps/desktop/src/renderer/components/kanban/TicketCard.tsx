import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import type { Ticket } from '@shared/types'

interface TicketCardProps {
  ticket: Ticket
  index: number
  onClick: (ticket: Ticket) => void
}

const TYPE_CLASSES: Record<string, string> = {
  feature: 'ticket-type-badge--feature',
  bug: 'ticket-type-badge--bug',
  chore: 'ticket-type-badge--chore',
  spike: 'ticket-type-badge--chore',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'var(--priority-low, #22c55e)',
  medium: 'var(--priority-medium, #eab308)',
  high: 'var(--priority-high, #f97316)',
  critical: 'var(--priority-critical, #ef4444)',
}

function TicketCardInner({ ticket, index, onClick }: TicketCardProps) {
  const handleClick = React.useCallback(() => {
    onClick(ticket)
  }, [onClick, ticket])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick(ticket)
      }
    },
    [onClick, ticket],
  )

  const isExecuting = ticket.status === 'in_progress'

  return (
    <Draggable draggableId={ticket.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={'ticket-card' + (snapshot.isDragging ? ' ticket-card--dragging' : '')}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          style={{
            ...provided.draggableProps.style,
            fontFamily: 'inherit',
          }}
        >
          {/* Title */}
          <div className="ticket-card-title" style={{ fontFamily: 'inherit' }}>
            {ticket.title}
          </div>

          {/* Metadata row */}
          <div className="ticket-card-meta">
            {/* Type badge */}
            <span
              className={'ticket-type-badge ' + (TYPE_CLASSES[ticket.type] ?? '')}
              style={{ fontFamily: 'inherit' }}
            >
              {ticket.type}
            </span>

            {/* Priority dot */}
            <span
              className="ticket-priority-dot"
              style={{
                backgroundColor: PRIORITY_COLORS[ticket.priority],
                fontFamily: 'inherit',
              }}
              title={ticket.priority}
              aria-label={`Priority: ${ticket.priority}`}
            />

            {/* PRD status indicator */}
            {ticket.prd && (
              <span
                className={
                  'ticket-prd-indicator' + (ticket.prd.approved ? ' prd-approved' : ' prd-pending')
                }
                title={ticket.prd.approved ? 'PRD approved' : 'PRD pending review'}
                style={{ fontFamily: 'inherit' }}
              >
                {ticket.prd.approved ? '\u2713' : '\u23F0'}
              </span>
            )}

            {/* Ralph status badge */}
            <span
              className={'ticket-ralph-badge' + (isExecuting ? ' ralph-executing' : '')}
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        </div>
      )}
    </Draggable>
  )
}

function arePropsEqual(prev: TicketCardProps, next: TicketCardProps): boolean {
  if (prev.index !== next.index) return false
  if (prev.onClick !== next.onClick) return false

  const a = prev.ticket
  const b = next.ticket
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.status === b.status &&
    a.type === b.type &&
    a.priority === b.priority &&
    a.updatedAt === b.updatedAt &&
    a.prd?.approved === b.prd?.approved
  )
}

export const TicketCard = React.memo(TicketCardInner, arePropsEqual)
