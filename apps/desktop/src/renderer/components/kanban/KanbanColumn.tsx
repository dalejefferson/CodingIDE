import React from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { TicketCard } from './TicketCard'
import { GhostCard } from './GhostCard'
import type { Ticket, TicketStatus } from '@shared/types'

interface KanbanColumnProps {
  status: TicketStatus
  label: string
  tickets: Ticket[]
  onTicketClick: (ticket: Ticket) => void
  onAddTicket?: () => void
}

function KanbanColumnInner({
  status,
  label,
  tickets,
  onTicketClick,
  onAddTicket,
}: KanbanColumnProps) {
  return (
    <div className={`kanban-column kanban-column--${status}`}>
      <div className="kanban-column-header">
        <span className="kanban-column-name" style={{ fontFamily: 'inherit' }}>
          {label}
        </span>
        <span className="kanban-column-count" style={{ fontFamily: 'inherit' }}>
          {tickets.length}
        </span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={
              'kanban-ticket-list' + (snapshot.isDraggingOver ? ' kanban-column--drag-over' : '')
            }
          >
            {tickets.length === 0 ? (
              <div className="kanban-empty" style={{ fontFamily: 'inherit' }}>
                No tickets
              </div>
            ) : (
              tickets.map((ticket, index) => (
                <TicketCard key={ticket.id} ticket={ticket} index={index} onClick={onTicketClick} />
              ))
            )}
            {provided.placeholder}
            {onAddTicket && <GhostCard onClick={onAddTicket} />}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export const KanbanColumn = React.memo(KanbanColumnInner)
