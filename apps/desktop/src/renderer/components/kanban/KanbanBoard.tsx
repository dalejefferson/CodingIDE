import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { KanbanColumn } from './KanbanColumn'
import type { Ticket, TicketStatus } from '@shared/types'
import { VALID_TRANSITIONS } from '@shared/types'

interface KanbanBoardProps {
  ticketsByStatus: Record<TicketStatus, Ticket[]>
  onDragEnd: (result: DropResult) => void
  onBeforeDragStart?: () => void
  onTicketClick: (ticket: Ticket) => void
  onAddTicket?: () => void
}

const COLUMN_ORDER: TicketStatus[] = [
  'backlog',
  'up_next',
  'in_review',
  'in_progress',
  'in_testing',
  'completed',
]

const COLUMN_LABELS: Record<TicketStatus, string> = {
  backlog: 'Backlog',
  up_next: 'Up Next',
  in_review: 'In Review',
  in_progress: 'In Progress',
  in_testing: 'Testing',
  completed: 'Completed',
}

export function KanbanBoard({
  ticketsByStatus,
  onDragEnd,
  onBeforeDragStart,
  onTicketClick,
  onAddTicket,
}: KanbanBoardProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd} onBeforeDragStart={onBeforeDragStart}>
      <div className="kanban-board">
        {COLUMN_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            label={COLUMN_LABELS[status]}
            tickets={ticketsByStatus[status] ?? []}
            onTicketClick={onTicketClick}
            onAddTicket={onAddTicket}
          />
        ))}
      </div>
    </DragDropContext>
  )
}

// Re-export for consumers that need column metadata
export { COLUMN_ORDER, COLUMN_LABELS, VALID_TRANSITIONS }
