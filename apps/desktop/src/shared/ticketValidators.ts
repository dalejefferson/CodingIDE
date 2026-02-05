/**
 * Runtime type guards for Kanban / Ralph Loop IPC payloads.
 *
 * Extracted from ipcContracts.ts to keep that file under 300 LOC.
 * Same validation approach: manual type guards, zero dependencies.
 */

import { TICKET_STATUSES, TICKET_TYPES, TICKET_PRIORITIES } from './types'

/** Payload must be a valid CreateTicketRequest */
export function isCreateTicketRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['title'] !== 'string' || obj['title'].length === 0) return false
  if (typeof obj['description'] !== 'string') return false
  if (!Array.isArray(obj['acceptanceCriteria'])) return false
  if (!(obj['acceptanceCriteria'] as unknown[]).every((item) => typeof item === 'string')) {
    return false
  }
  if (
    typeof obj['type'] !== 'string' ||
    !(TICKET_TYPES as readonly string[]).includes(obj['type'])
  ) {
    return false
  }
  if (
    typeof obj['priority'] !== 'string' ||
    !(TICKET_PRIORITIES as readonly string[]).includes(obj['priority'])
  ) {
    return false
  }
  if (obj['projectId'] !== null && typeof obj['projectId'] !== 'string') return false
  return true
}

/** Payload must be a valid UpdateTicketRequest */
export function isUpdateTicketRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['id'] !== 'string' || obj['id'].length === 0) return false
  if (obj['title'] !== undefined && (typeof obj['title'] !== 'string' || obj['title'].length === 0))
    return false
  if (obj['description'] !== undefined && typeof obj['description'] !== 'string') return false
  if (obj['acceptanceCriteria'] !== undefined) {
    if (!Array.isArray(obj['acceptanceCriteria'])) return false
    if (!(obj['acceptanceCriteria'] as unknown[]).every((item) => typeof item === 'string')) {
      return false
    }
  }
  if (obj['type'] !== undefined) {
    if (
      typeof obj['type'] !== 'string' ||
      !(TICKET_TYPES as readonly string[]).includes(obj['type'])
    ) {
      return false
    }
  }
  if (obj['priority'] !== undefined) {
    if (
      typeof obj['priority'] !== 'string' ||
      !(TICKET_PRIORITIES as readonly string[]).includes(obj['priority'])
    ) {
      return false
    }
  }
  if (obj['projectId'] !== undefined && obj['projectId'] !== null) {
    if (typeof obj['projectId'] !== 'string') return false
  }
  return true
}

/** Payload must be a valid TransitionTicketRequest */
export function isTransitionTicketRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['id'] !== 'string' || obj['id'].length === 0) return false
  return (
    typeof obj['status'] === 'string' &&
    (TICKET_STATUSES as readonly string[]).includes(obj['status'])
  )
}

/** Payload must be a valid ReorderTicketRequest */
export function isReorderTicketRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['id'] !== 'string' || obj['id'].length === 0) return false
  if (
    typeof obj['status'] !== 'string' ||
    !(TICKET_STATUSES as readonly string[]).includes(obj['status'])
  ) {
    return false
  }
  return typeof obj['index'] === 'number' && obj['index'] >= 0
}

/** Payload must be a valid GeneratePRDRequest */
export function isGeneratePRDRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['ticketId'] === 'string' && obj['ticketId'].length > 0
}

/** Payload must be a valid ApprovePRDRequest (same shape for approve + reject) */
export function isApprovePRDRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['ticketId'] === 'string' && obj['ticketId'].length > 0
}

/** Payload must be a valid RalphExecuteRequest */
export function isRalphExecuteRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['ticketId'] !== 'string' || obj['ticketId'].length === 0) return false
  if (obj['worktreeBasePath'] !== undefined && typeof obj['worktreeBasePath'] !== 'string') {
    return false
  }
  return true
}

/** Payload must be a valid RalphStatusRequest */
export function isRalphStatusRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['ticketId'] === 'string' && obj['ticketId'].length > 0
}

/** Payload must be a valid RalphStopRequest */
export function isRalphStopRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['ticketId'] === 'string' && obj['ticketId'].length > 0
}

/** Payload must be a valid OpenTicketAsProjectRequest */
export function isOpenTicketAsProjectRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['ticketId'] === 'string' && obj['ticketId'].length > 0
}
