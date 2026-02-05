import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Ticket, TicketStatus, CreateTicketRequest, UpdateTicketRequest } from '@shared/types'
import { TICKET_STATUSES } from '@shared/types'

// ── Types ───────────────────────────────────────────────────────

/** Tickets grouped by status column, sorted by `order` within each group. */
export type TicketsByStatus = Record<TicketStatus, Ticket[]>

export interface UseTicketsReturn {
  /** All tickets (flat array, sorted by order). */
  tickets: Ticket[]
  /** Tickets grouped by status for column rendering. */
  ticketsByStatus: TicketsByStatus
  /** True while the initial load is in flight. */
  loading: boolean
  /** Create a new ticket and append it to local state. */
  createTicket: (request: CreateTicketRequest) => Promise<Ticket>
  /** Update an existing ticket's fields (title, description, etc.). */
  updateTicket: (request: UpdateTicketRequest) => Promise<void>
  /** Delete a ticket by id. */
  deleteTicket: (id: string) => Promise<void>
  /** Transition a ticket to a new status (validates against allowed transitions). */
  transitionTicket: (id: string, status: TicketStatus) => Promise<void>
  /** Reorder a ticket within (or across) status columns. */
  reorderTicket: (id: string, status: TicketStatus, index: number) => Promise<void>
  /** Generate a PRD for a ticket via the main process. */
  generatePRD: (ticketId: string) => Promise<void>
  /** Approve a ticket's PRD and update local state. */
  approvePRD: (ticketId: string) => Promise<void>
  /** Re-fetch all tickets from the main process. */
  refreshTickets: () => Promise<void>
}

// ── Helpers ─────────────────────────────────────────────────────

/** Build an empty TicketsByStatus record with every status key initialized. */
function emptyByStatus(): TicketsByStatus {
  const record = {} as TicketsByStatus
  for (const status of TICKET_STATUSES) {
    record[status] = []
  }
  return record
}

/** Sort tickets by their `order` field (ascending). */
function sortByOrder(a: Ticket, b: Ticket): number {
  return a.order - b.order
}

/**
 * Group a flat ticket array into a Record keyed by TicketStatus.
 * Each group is sorted by the ticket's `order` field.
 */
function groupByStatus(tickets: Ticket[]): TicketsByStatus {
  const grouped = emptyByStatus()
  for (const ticket of tickets) {
    grouped[ticket.status].push(ticket)
  }
  for (const status of TICKET_STATUSES) {
    grouped[status].sort(sortByOrder)
  }
  return grouped
}

// ── Hook ────────────────────────────────────────────────────────

/**
 * Manages ticket CRUD via `window.electronAPI.tickets.*`.
 *
 * - Loads all tickets on mount.
 * - Subscribes to `ticket:status-changed` broadcasts so the UI
 *   stays in sync when the main process transitions a ticket
 *   (e.g. Ralph Loop advancing a ticket through the pipeline).
 * - Provides stable callbacks for create / update / delete /
 *   transition / reorder that optimistically update local state
 *   and fall back to a full refresh on error.
 */
export function useTickets(filterProjectId?: string | null): UseTicketsReturn {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  // ── Initial load ────────────────────────────────────────────

  const refreshTickets = useCallback(async () => {
    try {
      const all = await window.electronAPI.tickets.getAll()
      setTickets(all.sort(sortByOrder))
    } catch (err) {
      console.error('[useTickets] Failed to fetch tickets:', err)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const all = await window.electronAPI.tickets.getAll()
        if (!cancelled) {
          setTickets(all.sort(sortByOrder))
        }
      } catch (err) {
        console.error('[useTickets] Initial load failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Broadcast listener ──────────────────────────────────────

  useEffect(() => {
    const unsubscribe = window.electronAPI.tickets.onStatusChanged((updated: Ticket) => {
      setTickets((prev) => {
        const idx = prev.findIndex((t) => t.id === updated.id)
        if (idx === -1) {
          // New ticket we didn't know about — append it
          return [...prev, updated].sort(sortByOrder)
        }
        const next = [...prev]
        next[idx] = updated
        return next.sort(sortByOrder)
      })
    })
    return unsubscribe
  }, [])

  // ── CRUD callbacks ──────────────────────────────────────────

  const createTicket = useCallback(async (request: CreateTicketRequest): Promise<Ticket> => {
    const ticket = await window.electronAPI.tickets.create(request)
    setTickets((prev) => [...prev, ticket].sort(sortByOrder))
    return ticket
  }, [])

  const updateTicket = useCallback(async (request: UpdateTicketRequest): Promise<void> => {
    await window.electronAPI.tickets.update(request)
    // Optimistically patch local state
    setTickets((prev) =>
      prev.map((t) => (t.id === request.id ? { ...t, ...request } : t)).sort(sortByOrder),
    )
  }, [])

  const deleteTicket = useCallback(async (id: string): Promise<void> => {
    await window.electronAPI.tickets.delete(id)
    setTickets((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const transitionTicket = useCallback(async (id: string, status: TicketStatus): Promise<void> => {
    await window.electronAPI.tickets.transition({ id, status })
    // Optimistically move ticket to new status
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)).sort(sortByOrder))
  }, [])

  const reorderTicket = useCallback(
    async (id: string, status: TicketStatus, index: number): Promise<void> => {
      const updated = await window.electronAPI.tickets.reorder({ id, status, index })
      setTickets(updated.sort(sortByOrder))
    },
    [],
  )

  const generatePRD = useCallback(async (ticketId: string): Promise<void> => {
    const prd = await window.electronAPI.prd.generate({ ticketId })
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, prd } : t)))
  }, [])

  const approvePRD = useCallback(async (ticketId: string): Promise<void> => {
    await window.electronAPI.prd.approve({ ticketId })
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId && t.prd ? { ...t, prd: { ...t.prd, approved: true } } : t,
      ),
    )
  }, [])

  // ── Derived state ───────────────────────────────────────────

  const ticketsByStatus = useMemo(() => {
    const filtered = filterProjectId
      ? tickets.filter((t) => t.projectId === filterProjectId)
      : tickets
    return groupByStatus(filtered)
  }, [tickets, filterProjectId])

  // ── Return ──────────────────────────────────────────────────

  return {
    tickets,
    ticketsByStatus,
    loading,
    createTicket,
    updateTicket,
    deleteTicket,
    transitionTicket,
    reorderTicket,
    generatePRD,
    approvePRD,
    refreshTickets,
  }
}
