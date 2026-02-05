import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Ticket, TicketStatus, CreateTicketRequest, UpdateTicketRequest } from '@shared/types'
import { VALID_TRANSITIONS } from '@shared/types'

/**
 * JSON file-based ticket store.
 *
 * Follows the same pattern as ProjectStore:
 *   - Lazy-load on first access
 *   - Debounced atomic writes (write-to-temp + rename)
 *   - Constructor accepts custom path for testability
 */
export class TicketStore {
  private filePath: string
  private tickets: Ticket[] | null = null
  private dirty = false
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly DEBOUNCE_MS = 500

  constructor(filePath: string) {
    this.filePath = filePath
  }

  private markDirty(): void {
    this.dirty = true
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        this.flush()
      }, this.DEBOUNCE_MS)
    }
  }

  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (!this.dirty) return
    this.dirty = false
    this.persist()
  }

  private load(): Ticket[] {
    if (this.tickets !== null) return this.tickets

    if (!existsSync(this.filePath)) {
      this.tickets = []
      return this.tickets
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        this.tickets = []
        return this.tickets
      }
      this.tickets = parsed as Ticket[]
    } catch {
      this.tickets = []
    }

    return this.tickets
  }

  private persist(): void {
    const tickets = this.load()
    const dir = dirname(this.filePath)
    mkdirSync(dir, { recursive: true })

    const tmp = join(dir, `.tickets-${Date.now()}.tmp`)
    writeFileSync(tmp, JSON.stringify(tickets, null, 2), 'utf-8')
    renameSync(tmp, this.filePath)
  }

  getAll(): Ticket[] {
    return [...this.load()]
  }

  getById(id: string): Ticket | undefined {
    return this.load().find((t) => t.id === id)
  }

  create(request: CreateTicketRequest): Ticket {
    const tickets = this.load()
    const now = Date.now()

    // Order: place at end of backlog column
    const backlogTickets = tickets.filter((t) => t.status === 'backlog')
    const maxOrder =
      backlogTickets.length > 0 ? Math.max(...backlogTickets.map((t) => t.order)) : -1

    const ticket: Ticket = {
      id: randomUUID(),
      title: request.title,
      description: request.description,
      acceptanceCriteria: [...request.acceptanceCriteria],
      status: 'backlog',
      type: request.type,
      priority: request.priority,
      projectId: request.projectId,
      prd: request.prd ?? null,
      history: [{ timestamp: now, action: 'created' }],
      worktreeBasePath: null,
      worktreePath: null,
      createdAt: now,
      updatedAt: now,
      order: maxOrder + 1,
    }

    tickets.push(ticket)
    this.markDirty()
    return ticket
  }

  update(id: string, updates: Omit<UpdateTicketRequest, 'id'>): boolean {
    const tickets = this.load()
    const ticket = tickets.find((t) => t.id === id)
    if (!ticket) return false

    if (updates.title !== undefined) ticket.title = updates.title
    if (updates.description !== undefined) ticket.description = updates.description
    if (updates.acceptanceCriteria !== undefined) {
      ticket.acceptanceCriteria = [...updates.acceptanceCriteria]
    }
    if (updates.type !== undefined) ticket.type = updates.type
    if (updates.priority !== undefined) ticket.priority = updates.priority
    if (updates.projectId !== undefined) ticket.projectId = updates.projectId

    ticket.updatedAt = Date.now()
    ticket.history.push({ timestamp: ticket.updatedAt, action: 'updated' })
    this.markDirty()
    return true
  }

  delete(id: string): boolean {
    const tickets = this.load()
    const idx = tickets.findIndex((t) => t.id === id)
    if (idx === -1) return false

    tickets.splice(idx, 1)
    this.markDirty()
    return true
  }

  transition(id: string, newStatus: TicketStatus): boolean {
    const tickets = this.load()
    const ticket = tickets.find((t) => t.id === id)
    if (!ticket) return false

    const allowed = VALID_TRANSITIONS[ticket.status]
    if (!allowed.includes(newStatus)) return false

    const oldStatus = ticket.status
    ticket.status = newStatus
    ticket.updatedAt = Date.now()

    // Place at end of new column
    const columnTickets = tickets.filter((t) => t.status === newStatus && t.id !== id)
    const maxOrder = columnTickets.length > 0 ? Math.max(...columnTickets.map((t) => t.order)) : -1
    ticket.order = maxOrder + 1

    ticket.history.push({
      timestamp: ticket.updatedAt,
      action: 'transitioned',
      from: oldStatus,
      to: newStatus,
    })

    this.markDirty()
    return true
  }

  reorder(id: string, targetStatus: TicketStatus, targetIndex: number): Ticket[] {
    const tickets = this.load()
    const ticket = tickets.find((t) => t.id === id)
    if (!ticket) return this.getAll()

    // If moving to a different column, validate transition
    if (ticket.status !== targetStatus) {
      const allowed = VALID_TRANSITIONS[ticket.status]
      if (!allowed.includes(targetStatus)) return this.getAll()
      ticket.status = targetStatus
      ticket.history.push({
        timestamp: Date.now(),
        action: 'transitioned',
        from: ticket.status,
        to: targetStatus,
      })
    }

    // Get all tickets in the target column (excluding the moved one)
    const columnTickets = tickets
      .filter((t) => t.status === targetStatus && t.id !== id)
      .sort((a, b) => a.order - b.order)

    // Insert at target index
    columnTickets.splice(targetIndex, 0, ticket)

    // Reassign order values
    columnTickets.forEach((t, i) => {
      t.order = i
    })

    ticket.updatedAt = Date.now()
    this.markDirty()
    return this.getAll()
  }

  /** Set the worktree base path on a ticket (user-chosen directory) */
  setWorktreePath(id: string, basePath: string, fullPath: string): boolean {
    const tickets = this.load()
    const ticket = tickets.find((t) => t.id === id)
    if (!ticket) return false

    ticket.worktreeBasePath = basePath
    ticket.worktreePath = fullPath
    ticket.updatedAt = Date.now()
    this.markDirty()
    return true
  }

  /** Set or update a ticket's PRD */
  setPRD(id: string, content: string, approved: boolean): boolean {
    const tickets = this.load()
    const ticket = tickets.find((t) => t.id === id)
    if (!ticket) return false

    ticket.prd = { content, generatedAt: Date.now(), approved }
    ticket.updatedAt = Date.now()
    this.markDirty()
    return true
  }

  /** Approve or reject a ticket's PRD */
  approvePRD(id: string, approved: boolean): boolean {
    const tickets = this.load()
    const ticket = tickets.find((t) => t.id === id)
    if (!ticket || !ticket.prd) return false

    ticket.prd.approved = approved
    ticket.updatedAt = Date.now()
    ticket.history.push({
      timestamp: ticket.updatedAt,
      action: approved ? 'prd_approved' : 'prd_rejected',
    })
    this.markDirty()
    return true
  }
}
