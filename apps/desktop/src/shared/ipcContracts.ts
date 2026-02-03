/**
 * IPC Contract Definitions — Single Source of Truth
 *
 * Every IPC channel must be declared here with:
 * 1. Channel constant (IPC_CHANNELS)
 * 2. Type contract (IPCContracts)
 * 3. Runtime validator (IPC_VALIDATORS)
 *
 * Validation approach: manual type guards (zero dependencies).
 * Rationale: all current payloads are void — manual guards are trivially
 * correct and keep the bundle small. Switch to zod when payloads grow
 * complex enough to warrant a schema library.
 */

import type { Project, AddProjectRequest, ThemeId, SetProjectThemeRequest } from './types'
import { THEME_IDS } from './types'

// ── Channel Constants ──────────────────────────────────────────

export const IPC_CHANNELS = {
  PING: 'ipc:ping',
  GET_APP_VERSION: 'ipc:get-app-version',
  WINDOW_MINIMIZE: 'ipc:window-minimize',
  WINDOW_MAXIMIZE: 'ipc:window-maximize',
  WINDOW_CLOSE: 'ipc:window-close',
  OPEN_FOLDER_DIALOG: 'ipc:open-folder-dialog',
  GET_PROJECTS: 'ipc:get-projects',
  ADD_PROJECT: 'ipc:add-project',
  REMOVE_PROJECT: 'ipc:remove-project',
  GET_GLOBAL_THEME: 'ipc:get-global-theme',
  SET_GLOBAL_THEME: 'ipc:set-global-theme',
  SET_PROJECT_THEME: 'ipc:set-project-theme',
} as const

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/** Frozen set of all allowed channels — used for allowlist checks */
export const ALLOWED_CHANNELS: ReadonlySet<string> = new Set<string>(Object.values(IPC_CHANNELS))

// ── Type Contracts ─────────────────────────────────────────────

export interface IPCContracts {
  [IPC_CHANNELS.PING]: {
    request: void
    response: string
  }
  [IPC_CHANNELS.GET_APP_VERSION]: {
    request: void
    response: string
  }
  [IPC_CHANNELS.WINDOW_MINIMIZE]: {
    request: void
    response: void
  }
  [IPC_CHANNELS.WINDOW_MAXIMIZE]: {
    request: void
    response: void
  }
  [IPC_CHANNELS.WINDOW_CLOSE]: {
    request: void
    response: void
  }
  [IPC_CHANNELS.OPEN_FOLDER_DIALOG]: {
    request: void
    response: string | null
  }
  [IPC_CHANNELS.GET_PROJECTS]: {
    request: void
    response: Project[]
  }
  [IPC_CHANNELS.ADD_PROJECT]: {
    request: AddProjectRequest
    response: Project
  }
  [IPC_CHANNELS.REMOVE_PROJECT]: {
    request: string
    response: void
  }
  [IPC_CHANNELS.GET_GLOBAL_THEME]: {
    request: void
    response: ThemeId
  }
  [IPC_CHANNELS.SET_GLOBAL_THEME]: {
    request: ThemeId
    response: void
  }
  [IPC_CHANNELS.SET_PROJECT_THEME]: {
    request: SetProjectThemeRequest
    response: void
  }
}

// ── Runtime Validators ─────────────────────────────────────────

export type PayloadValidator = (payload: unknown) => boolean

/** Payload must be undefined (no arguments expected) */
export function isVoid(payload: unknown): boolean {
  return payload === undefined
}

/** Payload must be a string */
export function isString(payload: unknown): boolean {
  return typeof payload === 'string'
}

/** Payload must be a non-empty string */
export function isNonEmptyString(payload: unknown): boolean {
  return typeof payload === 'string' && payload.length > 0
}

/** Payload must be a valid AddProjectRequest */
export function isAddProjectRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['path'] === 'string' && obj['path'].length > 0
}

/** Payload must be a valid ThemeId ('light' | 'dark') */
export function isThemeId(payload: unknown): boolean {
  return typeof payload === 'string' && (THEME_IDS as readonly string[]).includes(payload)
}

/** Payload must be a valid SetProjectThemeRequest */
export function isSetProjectThemeRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['id'] !== 'string' || obj['id'].length === 0) return false
  // theme can be a valid ThemeId or null (to clear the override)
  return obj['theme'] === null || isThemeId(obj['theme'])
}

/**
 * Validator registry — exactly one validator per channel.
 * Adding a channel without a validator is a compile error.
 */
export const IPC_VALIDATORS: Record<IPCChannel, PayloadValidator> = {
  [IPC_CHANNELS.PING]: isVoid,
  [IPC_CHANNELS.GET_APP_VERSION]: isVoid,
  [IPC_CHANNELS.WINDOW_MINIMIZE]: isVoid,
  [IPC_CHANNELS.WINDOW_MAXIMIZE]: isVoid,
  [IPC_CHANNELS.WINDOW_CLOSE]: isVoid,
  [IPC_CHANNELS.OPEN_FOLDER_DIALOG]: isVoid,
  [IPC_CHANNELS.GET_PROJECTS]: isVoid,
  [IPC_CHANNELS.ADD_PROJECT]: isAddProjectRequest,
  [IPC_CHANNELS.REMOVE_PROJECT]: isNonEmptyString,
  [IPC_CHANNELS.GET_GLOBAL_THEME]: isVoid,
  [IPC_CHANNELS.SET_GLOBAL_THEME]: isThemeId,
  [IPC_CHANNELS.SET_PROJECT_THEME]: isSetProjectThemeRequest,
}

// ── Validation Helpers ─────────────────────────────────────────

/** Check if a channel string is in the allowlist */
export function isAllowedChannel(channel: string): channel is IPCChannel {
  return ALLOWED_CHANNELS.has(channel)
}

/** Validate a payload against the channel's registered validator */
export function validatePayload(channel: IPCChannel, payload: unknown): boolean {
  return IPC_VALIDATORS[channel](payload)
}
