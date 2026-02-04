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

import type {
  Project,
  AddProjectRequest,
  GitBranchRequest,
  GitBranchResponse,
  ThemeId,
  SetProjectThemeRequest,
  SetProjectStatusRequest,
  TerminalCreateRequest,
  TerminalWriteRequest,
  TerminalResizeRequest,
  TerminalKillRequest,
  TerminalLayoutRequest,
  TerminalSetLayoutRequest,
  NativeNotifyRequest,
  CommandPreset,
  SetPresetsRequest,
  BrowserNavigateRequest,
} from './types'
import { THEME_IDS, PROJECT_STATUSES } from './types'
import { isValidLayout } from './terminalLayout'

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
  TERMINAL_CREATE: 'ipc:terminal-create',
  TERMINAL_WRITE: 'ipc:terminal-write',
  TERMINAL_RESIZE: 'ipc:terminal-resize',
  TERMINAL_KILL: 'ipc:terminal-kill',
  TERMINAL_KILL_ALL: 'ipc:terminal-kill-all',
  TERMINAL_GET_BUFFER: 'ipc:terminal-get-buffer',
  TERMINAL_GET_LAYOUT: 'ipc:terminal-get-layout',
  TERMINAL_SET_LAYOUT: 'ipc:terminal-set-layout',
  GIT_BRANCH: 'ipc:git-branch',
  NATIVE_NOTIFY: 'ipc:native-notify',
  OPEN_EXTERNAL_URL: 'ipc:open-external-url',
  GET_PRESETS: 'ipc:get-presets',
  SET_PRESETS: 'ipc:set-presets',
  SET_PROJECT_STATUS: 'ipc:set-project-status',
  BROWSER_NAVIGATE: 'ipc:browser-navigate',
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
  [IPC_CHANNELS.TERMINAL_CREATE]: {
    request: TerminalCreateRequest
    response: void
  }
  [IPC_CHANNELS.TERMINAL_WRITE]: {
    request: TerminalWriteRequest
    response: void
  }
  [IPC_CHANNELS.TERMINAL_RESIZE]: {
    request: TerminalResizeRequest
    response: void
  }
  [IPC_CHANNELS.TERMINAL_KILL]: {
    request: TerminalKillRequest
    response: void
  }
  [IPC_CHANNELS.TERMINAL_KILL_ALL]: {
    request: string
    response: void
  }
  [IPC_CHANNELS.TERMINAL_GET_BUFFER]: {
    request: TerminalKillRequest
    response: string
  }
  [IPC_CHANNELS.TERMINAL_GET_LAYOUT]: {
    request: TerminalLayoutRequest
    response: unknown | null
  }
  [IPC_CHANNELS.TERMINAL_SET_LAYOUT]: {
    request: TerminalSetLayoutRequest
    response: void
  }
  [IPC_CHANNELS.GIT_BRANCH]: {
    request: GitBranchRequest
    response: GitBranchResponse
  }
  [IPC_CHANNELS.NATIVE_NOTIFY]: {
    request: NativeNotifyRequest
    response: void
  }
  [IPC_CHANNELS.OPEN_EXTERNAL_URL]: {
    request: string
    response: void
  }
  [IPC_CHANNELS.GET_PRESETS]: {
    request: void
    response: CommandPreset[]
  }
  [IPC_CHANNELS.SET_PRESETS]: {
    request: SetPresetsRequest
    response: void
  }
  [IPC_CHANNELS.SET_PROJECT_STATUS]: {
    request: SetProjectStatusRequest
    response: void
  }
  [IPC_CHANNELS.BROWSER_NAVIGATE]: {
    request: BrowserNavigateRequest
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

/** Payload must be a valid TerminalCreateRequest */
export function isTerminalCreateRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['projectId'] !== 'string' || obj['projectId'].length === 0) return false
  if (typeof obj['terminalId'] !== 'string' || obj['terminalId'].length === 0) return false
  if (typeof obj['cwd'] !== 'string' || obj['cwd'].length === 0) return false
  if (obj['cols'] !== undefined && (typeof obj['cols'] !== 'number' || obj['cols'] < 1)) {
    return false
  }
  if (obj['rows'] !== undefined && (typeof obj['rows'] !== 'number' || obj['rows'] < 1)) {
    return false
  }
  return true
}

/** Payload must be a valid TerminalWriteRequest */
export function isTerminalWriteRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return (
    typeof obj['terminalId'] === 'string' &&
    obj['terminalId'].length > 0 &&
    typeof obj['data'] === 'string'
  )
}

/** Payload must be a valid TerminalResizeRequest */
export function isTerminalResizeRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return (
    typeof obj['terminalId'] === 'string' &&
    obj['terminalId'].length > 0 &&
    typeof obj['cols'] === 'number' &&
    obj['cols'] >= 1 &&
    typeof obj['rows'] === 'number' &&
    obj['rows'] >= 1
  )
}

/** Payload must be a valid TerminalKillRequest */
export function isTerminalKillRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['terminalId'] === 'string' && obj['terminalId'].length > 0
}

/** Payload must be a valid TerminalLayoutRequest */
export function isTerminalLayoutRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['projectId'] === 'string' && obj['projectId'].length > 0
}

/** Payload must be a valid TerminalSetLayoutRequest */
export function isTerminalSetLayoutRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['projectId'] !== 'string' || obj['projectId'].length === 0) return false
  return isValidLayout(obj['layout'])
}

/** Payload must be a valid GitBranchRequest */
export function isGitBranchRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['cwd'] === 'string' && obj['cwd'].length > 0
}

/** Payload must be a valid NativeNotifyRequest */
export function isNativeNotifyRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['title'] !== 'string' || obj['title'].length === 0) return false
  if (obj['body'] !== undefined && typeof obj['body'] !== 'string') return false
  return true
}

/** Payload must be a valid SetProjectStatusRequest */
export function isSetProjectStatusRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['id'] !== 'string' || obj['id'].length === 0) return false
  return (
    typeof obj['status'] === 'string' &&
    (PROJECT_STATUSES as readonly string[]).includes(obj['status'])
  )
}

/** Payload must be a valid BrowserNavigateRequest */
export function isBrowserNavigateRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['url'] !== 'string' || obj['url'].length === 0) return false
  return obj['url'].startsWith('https://') || obj['url'].startsWith('http://')
}

/** Payload must be a valid SetPresetsRequest */
export function isSetPresetsRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (!Array.isArray(obj['presets'])) return false
  return (obj['presets'] as unknown[]).every((item) => {
    if (typeof item !== 'object' || item === null) return false
    const p = item as Record<string, unknown>
    return (
      typeof p['id'] === 'string' &&
      p['id'].length > 0 &&
      typeof p['name'] === 'string' &&
      p['name'].length > 0 &&
      typeof p['command'] === 'string' &&
      p['command'].length > 0
    )
  })
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
  [IPC_CHANNELS.TERMINAL_CREATE]: isTerminalCreateRequest,
  [IPC_CHANNELS.TERMINAL_WRITE]: isTerminalWriteRequest,
  [IPC_CHANNELS.TERMINAL_RESIZE]: isTerminalResizeRequest,
  [IPC_CHANNELS.TERMINAL_KILL]: isTerminalKillRequest,
  [IPC_CHANNELS.TERMINAL_KILL_ALL]: isNonEmptyString,
  [IPC_CHANNELS.TERMINAL_GET_BUFFER]: isTerminalKillRequest,
  [IPC_CHANNELS.TERMINAL_GET_LAYOUT]: isTerminalLayoutRequest,
  [IPC_CHANNELS.TERMINAL_SET_LAYOUT]: isTerminalSetLayoutRequest,
  [IPC_CHANNELS.GIT_BRANCH]: isGitBranchRequest,
  [IPC_CHANNELS.NATIVE_NOTIFY]: isNativeNotifyRequest,
  [IPC_CHANNELS.OPEN_EXTERNAL_URL]: isNonEmptyString,
  [IPC_CHANNELS.GET_PRESETS]: isVoid,
  [IPC_CHANNELS.SET_PRESETS]: isSetPresetsRequest,
  [IPC_CHANNELS.SET_PROJECT_STATUS]: isSetProjectStatusRequest,
  [IPC_CHANNELS.BROWSER_NAVIGATE]: isBrowserNavigateRequest,
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
