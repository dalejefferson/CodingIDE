import { useState, useCallback } from 'react'
import { KanbanBoard } from './KanbanBoard'
import { NewTicketModal } from './NewTicketModal'
import { TicketDetailModal } from './TicketDetailModal'
import { useTickets } from '../../hooks/useTickets'
import { useRalph } from '../../hooks/useRalph'
import type { Ticket, CreateTicketRequest, TicketStatus } from '@shared/types'
import type { Project } from '@shared/types'
import '../../styles/KanbanBoard.css'

interface KanbanPageProps {
  projects: Project[]
  onOpenTicketAsProject: (ticketId: string) => Promise<void>
}

export function KanbanPage({ projects, onOpenTicketAsProject }: KanbanPageProps) {
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null)

  const {
    ticketsByStatus,
    createTicket,
    updateTicket,
    transitionTicket,
    reorderTicket,
    generatePRD,
    approvePRD,
  } = useTickets(filterProjectId)

  const { executeRalph } = useRalph()

  // Wrap transitionTicket to handle in_progress worktree picker flow.
  // Returns true if transition succeeded, false if aborted (e.g. user cancelled picker).
  const handleTransition = useCallback(
    async (id: string, status: TicketStatus): Promise<boolean> => {
      if (status === 'in_progress') {
        // Prompt user to choose worktree directory
        const dir = await window.electronAPI.ralph.chooseWorktreeDir()
        if (!dir) return false // User cancelled — abort transition

        await transitionTicket(id, status)

        // Fetch fresh tickets so we have the latest PRD state
        const fresh = await window.electronAPI.tickets.getAll()
        const ticket = fresh.find((t) => t.id === id)
        if (ticket?.prd?.approved) {
          await executeRalph(id, dir)
        }
        return true
      }
      await transitionTicket(id, status)
      return true
    },
    [transitionTicket, executeRalph],
  )

  const handleDragEnd = useCallback(
    async (result: import('@hello-pangea/dnd').DropResult) => {
      const { destination, source, draggableId } = result

      if (!destination) return
      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return
      }

      const newStatus = destination.droppableId as import('@shared/types').TicketStatus

      if (destination.droppableId !== source.droppableId) {
        const succeeded = await handleTransition(draggableId, newStatus)
        if (!succeeded) return // User cancelled — don't reorder
      }

      reorderTicket(draggableId, newStatus, destination.index)
    },
    [handleTransition, reorderTicket],
  )

  const handleTicketClick = useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket)
  }, [])

  const handleCreateTicket = useCallback(
    async (request: CreateTicketRequest) => {
      await createTicket(request)
      setShowNewTicket(false)
    },
    [createTicket],
  )

  const handleCloseDetail = useCallback(() => {
    setSelectedTicket(null)
  }, [])

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setFilterProjectId(value === '' ? null : value)
  }, [])

  return (
    <div className="kanban-page">
      <header className="kanban-header">
        <h1 className="kanban-title" style={{ fontFamily: 'inherit' }}>
          Ralph Loop
        </h1>

        <div className="kanban-header-actions">
          <select
            className="kanban-filter-select"
            value={filterProjectId ?? ''}
            onChange={handleFilterChange}
            style={{ fontFamily: 'inherit' }}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            className="kanban-new-ticket-btn"
            onClick={() => setShowNewTicket(true)}
            style={{ fontFamily: 'inherit' }}
          >
            + New Ticket
          </button>
        </div>
      </header>

      <KanbanBoard
        ticketsByStatus={ticketsByStatus}
        onDragEnd={handleDragEnd}
        onTicketClick={handleTicketClick}
      />

      {showNewTicket && (
        <NewTicketModal
          projects={projects}
          onSubmit={handleCreateTicket}
          onClose={() => setShowNewTicket(false)}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          projects={projects}
          onClose={handleCloseDetail}
          onUpdate={updateTicket}
          onTransition={handleTransition}
          onGeneratePRD={generatePRD}
          onApprovePRD={approvePRD}
          onOpenAsProject={onOpenTicketAsProject}
        />
      )}
    </div>
  )
}
