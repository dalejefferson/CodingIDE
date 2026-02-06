// ── Kanban / Ralph Loop ─────────────────────────────────────

export type TicketStatus =
  | 'backlog'
  | 'up_next'
  | 'in_review'
  | 'in_progress'
  | 'in_testing'
  | 'completed'

export const TICKET_STATUSES: readonly TicketStatus[] = [
  'backlog',
  'up_next',
  'in_review',
  'in_progress',
  'in_testing',
  'completed',
] as const

export const VALID_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  backlog: ['up_next'],
  up_next: ['in_review', 'backlog'],
  in_review: ['in_progress', 'backlog'],
  in_progress: ['in_testing'],
  in_testing: ['completed', 'in_progress'],
  completed: [],
} as const

export type TicketType = 'feature' | 'bug' | 'chore' | 'spike'

export const TICKET_TYPES: readonly TicketType[] = ['feature', 'bug', 'chore', 'spike'] as const

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'

export const TICKET_PRIORITIES: readonly TicketPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
] as const

export interface PRD {
  content: string
  generatedAt: number
  approved: boolean
}

export interface HistoryEvent {
  timestamp: number
  action: string
  from?: string
  to?: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  acceptanceCriteria: string[]
  status: TicketStatus
  type: TicketType
  priority: TicketPriority
  projectId: string | null
  prd: PRD | null
  history: HistoryEvent[]
  worktreeBasePath: string | null
  worktreePath: string | null
  createdAt: number
  updatedAt: number
  order: number
}

// ── Ticket IPC Request/Response Types ───────────────────────

export interface CreateTicketRequest {
  title: string
  description: string
  acceptanceCriteria: string[]
  type: TicketType
  priority: TicketPriority
  projectId: string | null
  prd?: PRD
}

export interface UpdateTicketRequest {
  id: string
  title?: string
  description?: string
  acceptanceCriteria?: string[]
  type?: TicketType
  priority?: TicketPriority
  projectId?: string | null
}

export interface TransitionTicketRequest {
  id: string
  status: TicketStatus
}

export interface ReorderTicketRequest {
  id: string
  status: TicketStatus
  index: number
}

export interface GeneratePRDRequest {
  ticketId: string
}

export interface ApprovePRDRequest {
  ticketId: string
}

export interface RalphExecuteRequest {
  ticketId: string
  worktreeBasePath?: string
}

export interface RalphStatusRequest {
  ticketId: string
}

export interface RalphStatusResponse {
  running: boolean
  iteration: number
  log: string
}

export interface RalphStopRequest {
  ticketId: string
}

export interface OpenTicketAsProjectRequest {
  ticketId: string
}
