/**
 * Runtime type guards for Idea Log IPC payloads.
 *
 * Extracted from ipcContracts.ts to keep that file under 300 LOC.
 * Same validation approach: manual type guards, zero dependencies.
 */

const VALID_PRIORITIES = new Set(['low', 'medium', 'high'])

function isValidPriority(v: unknown): boolean {
  return v === null || (typeof v === 'string' && VALID_PRIORITIES.has(v))
}

/** Payload must be a valid CreateIdeaRequest */
export function isCreateIdeaRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['title'] !== 'string' || obj['title'].length === 0) return false
  if (typeof obj['description'] !== 'string') return false
  if (obj['projectId'] !== null && typeof obj['projectId'] !== 'string') return false
  if (!isValidPriority(obj['priority'])) return false
  return true
}

/** Payload must be a valid UpdateIdeaRequest */
export function isUpdateIdeaRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['id'] !== 'string' || obj['id'].length === 0) return false
  if (obj['title'] !== undefined && typeof obj['title'] !== 'string') return false
  if (obj['description'] !== undefined && typeof obj['description'] !== 'string') return false
  if (
    obj['projectId'] !== undefined &&
    obj['projectId'] !== null &&
    typeof obj['projectId'] !== 'string'
  ) {
    return false
  }
  if (obj['priority'] !== undefined && !isValidPriority(obj['priority'])) return false
  return true
}
