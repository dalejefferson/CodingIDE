/**
 * Runtime type guards for App Builder / Expo IPC payloads.
 *
 * Extracted from ipcContracts.ts to keep that file under 300 LOC.
 * Same validation approach: manual type guards, zero dependencies.
 */

import { EXPO_TEMPLATES } from './types'

/** Payload must be a valid CreateMobileAppRequest (with optional PRD fields) */
export function isCreateMobileAppRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['name'] !== 'string' || obj['name'].length === 0) return false
  if (
    typeof obj['template'] !== 'string' ||
    !(EXPO_TEMPLATES as readonly string[]).includes(obj['template'])
  ) {
    return false
  }
  if (typeof obj['parentDir'] !== 'string' || obj['parentDir'].length === 0) return false
  // Optional PRD fields
  if (obj['prdContent'] !== undefined && typeof obj['prdContent'] !== 'string') return false
  if (obj['paletteId'] !== undefined && typeof obj['paletteId'] !== 'string') return false
  if (obj['imagePaths'] !== undefined) {
    if (!Array.isArray(obj['imagePaths'])) return false
    if (!(obj['imagePaths'] as unknown[]).every((p) => typeof p === 'string')) return false
  }
  return true
}

/** Payload must be a valid AddMobileAppRequest */
export function isAddMobileAppRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['path'] === 'string' && obj['path'].length > 0
}

/** Payload must be a valid StartExpoRequest */
export function isStartExpoRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['appId'] === 'string' && obj['appId'].length > 0
}

/** Payload must be a valid StopExpoRequest */
export function isStopExpoRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['appId'] === 'string' && obj['appId'].length > 0
}

/** Payload must be a valid ExpoStatusRequest */
export function isExpoStatusRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['appId'] === 'string' && obj['appId'].length > 0
}

/** Payload must be a valid OpenMobileAppAsProjectRequest */
export function isOpenMobileAppAsProjectRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['appId'] === 'string' && obj['appId'].length > 0
}

/** Payload must be a valid GenerateMobilePRDRequest */
export function isGenerateMobilePRDRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['appDescription'] !== 'string' || obj['appDescription'].length === 0) return false
  if (
    typeof obj['template'] !== 'string' ||
    !(EXPO_TEMPLATES as readonly string[]).includes(obj['template'])
  ) {
    return false
  }
  if (obj['paletteId'] !== undefined && typeof obj['paletteId'] !== 'string') return false
  return true
}

/** Payload must be a valid SavePRDRequest */
export function isSavePRDRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['appPath'] !== 'string' || obj['appPath'].length === 0) return false
  if (typeof obj['prdContent'] !== 'string' || obj['prdContent'].length === 0) return false
  if (obj['paletteId'] !== null && typeof obj['paletteId'] !== 'string') return false
  return true
}

/** Payload must be a valid CopyPRDImagesRequest */
export function isCopyPRDImagesRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['appPath'] !== 'string' || obj['appPath'].length === 0) return false
  if (!Array.isArray(obj['imagePaths'])) return false
  return (obj['imagePaths'] as unknown[]).every((p) => typeof p === 'string' && p.length > 0)
}
