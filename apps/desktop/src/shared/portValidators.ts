/**
 * Runtime type guards for Port Service IPC payloads.
 *
 * Same validation approach as the rest of the codebase:
 * manual type guards, zero dependencies.
 */

/** Port must be a positive integer in the valid TCP range (1-65535) */
function isValidPort(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 65535
}

/** Payload must be a valid PortCheckRequest */
export function isPortCheckRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return isValidPort(obj['port'])
}

/** Payload must be a valid PortFindAvailableRequest */
export function isPortFindAvailableRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return isValidPort(obj['basePort'])
}

/** Payload must be a valid PortRegisterRequest */
export function isPortRegisterRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['projectId'] !== 'string' || obj['projectId'].length === 0) return false
  return isValidPort(obj['port'])
}

/** Payload must be a valid PortUnregisterRequest */
export function isPortUnregisterRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['projectId'] !== 'string' || obj['projectId'].length === 0) return false
  return isValidPort(obj['port'])
}

/** Payload must be a valid PortGetOwnerRequest */
export function isPortGetOwnerRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return isValidPort(obj['port'])
}
