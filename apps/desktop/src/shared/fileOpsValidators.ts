import { FILE_WRITE_MODES } from './types'

/** Validate FileCreateRequest payload */
export function isFileCreateRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['projectId'] !== 'string' || obj['projectId'].length === 0) return false
  if (typeof obj['relPath'] !== 'string' || obj['relPath'].length === 0) return false
  if (obj['contents'] !== undefined && typeof obj['contents'] !== 'string') return false
  if (obj['mkdirp'] !== undefined && typeof obj['mkdirp'] !== 'boolean') return false
  return true
}

/** Validate FileReadRequest payload */
export function isFileReadRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['projectId'] !== 'string' || obj['projectId'].length === 0) return false
  if (typeof obj['relPath'] !== 'string' || obj['relPath'].length === 0) return false
  return true
}

/** Validate FileListRequest payload */
export function isFileListRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['projectId'] !== 'string' || obj['projectId'].length === 0) return false
  if (typeof obj['dirPath'] !== 'string') return false
  return true
}

/** Validate FileWriteRequest payload */
export function isFileWriteRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['projectId'] !== 'string' || obj['projectId'].length === 0) return false
  if (typeof obj['relPath'] !== 'string' || obj['relPath'].length === 0) return false
  if (typeof obj['contents'] !== 'string') return false
  if (
    typeof obj['mode'] !== 'string' ||
    !(FILE_WRITE_MODES as readonly string[]).includes(obj['mode'])
  ) {
    return false
  }
  return true
}
