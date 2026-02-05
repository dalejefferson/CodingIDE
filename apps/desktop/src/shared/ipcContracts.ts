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
  CreateProjectFolderRequest,
  GitBranchRequest,
  GitBranchResponse,
  ThemeId,
  SetProjectThemeRequest,
  SetProjectStatusRequest,
  SetProjectBrowserRequest,
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
  Ticket,
  CreateTicketRequest,
  UpdateTicketRequest,
  TransitionTicketRequest,
  ReorderTicketRequest,
  GeneratePRDRequest,
  ApprovePRDRequest,
  RalphExecuteRequest,
  RalphStatusRequest,
  RalphStatusResponse,
  RalphStopRequest,
  OpenTicketAsProjectRequest,
  PRD,
  FileCreateRequest,
  FileReadRequest,
  FileReadResponse,
  FileWriteRequest,
  FileOpsResult,
  FileListRequest,
  FileListResponse,
} from './types'
import { THEME_IDS, PROJECT_STATUSES, BROWSER_VIEW_MODES } from './types'
import { isValidLayout } from './terminalLayout'
import {
  isCreateTicketRequest,
  isUpdateTicketRequest,
  isTransitionTicketRequest,
  isReorderTicketRequest,
  isGeneratePRDRequest,
  isApprovePRDRequest,
  isRalphExecuteRequest,
  isRalphStatusRequest,
  isRalphStopRequest,
  isOpenTicketAsProjectRequest,
} from './ticketValidators'
import {
  isFileCreateRequest,
  isFileReadRequest,
  isFileWriteRequest,
  isFileListRequest,
} from './fileOpsValidators'

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
  CREATE_PROJECT_FOLDER: 'ipc:create-project-folder',
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
  SET_PROJECT_BROWSER: 'ipc:set-project-browser',
  // ── Kanban / Ralph Loop ──────────────────────────────────
  TICKET_GET_ALL: 'ipc:ticket-get-all',
  TICKET_CREATE: 'ipc:ticket-create',
  TICKET_UPDATE: 'ipc:ticket-update',
  TICKET_DELETE: 'ipc:ticket-delete',
  TICKET_TRANSITION: 'ipc:ticket-transition',
  TICKET_REORDER: 'ipc:ticket-reorder',
  PRD_GENERATE: 'ipc:prd-generate',
  PRD_APPROVE: 'ipc:prd-approve',
  PRD_REJECT: 'ipc:prd-reject',
  RALPH_EXECUTE: 'ipc:ralph-execute',
  RALPH_STATUS: 'ipc:ralph-status',
  RALPH_STOP: 'ipc:ralph-stop',
  RALPH_CHOOSE_WORKTREE_DIR: 'ipc:ralph-choose-worktree-dir',
  TICKET_OPEN_AS_PROJECT: 'ipc:ticket-open-as-project',
  // ── Settings ───────────────────────────────────────────────
  GET_OPENAI_KEY: 'ipc:get-openai-key',
  SET_OPENAI_KEY: 'ipc:set-openai-key',
  GET_CLAUDE_KEY: 'ipc:get-claude-key',
  SET_CLAUDE_KEY: 'ipc:set-claude-key',
  // ── File Operations ──────────────────────────────────────────
  FILE_CREATE: 'ipc:file-create',
  FILE_READ: 'ipc:file-read',
  FILE_WRITE: 'ipc:file-write',
  FILE_LIST: 'ipc:file-list',
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
  [IPC_CHANNELS.CREATE_PROJECT_FOLDER]: {
    request: CreateProjectFolderRequest
    response: string | null
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
    response: { created: boolean }
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
  [IPC_CHANNELS.SET_PROJECT_BROWSER]: {
    request: SetProjectBrowserRequest
    response: void
  }
  // ── Kanban / Ralph Loop ──────────────────────────────────
  [IPC_CHANNELS.TICKET_GET_ALL]: {
    request: void
    response: Ticket[]
  }
  [IPC_CHANNELS.TICKET_CREATE]: {
    request: CreateTicketRequest
    response: Ticket
  }
  [IPC_CHANNELS.TICKET_UPDATE]: {
    request: UpdateTicketRequest
    response: void
  }
  [IPC_CHANNELS.TICKET_DELETE]: {
    request: string
    response: void
  }
  [IPC_CHANNELS.TICKET_TRANSITION]: {
    request: TransitionTicketRequest
    response: void
  }
  [IPC_CHANNELS.TICKET_REORDER]: {
    request: ReorderTicketRequest
    response: Ticket[]
  }
  [IPC_CHANNELS.PRD_GENERATE]: {
    request: GeneratePRDRequest
    response: PRD
  }
  [IPC_CHANNELS.PRD_APPROVE]: {
    request: ApprovePRDRequest
    response: void
  }
  [IPC_CHANNELS.PRD_REJECT]: {
    request: ApprovePRDRequest
    response: void
  }
  [IPC_CHANNELS.RALPH_EXECUTE]: {
    request: RalphExecuteRequest
    response: void
  }
  [IPC_CHANNELS.RALPH_STATUS]: {
    request: RalphStatusRequest
    response: RalphStatusResponse
  }
  [IPC_CHANNELS.RALPH_STOP]: {
    request: RalphStopRequest
    response: void
  }
  [IPC_CHANNELS.RALPH_CHOOSE_WORKTREE_DIR]: {
    request: void
    response: string | null
  }
  [IPC_CHANNELS.TICKET_OPEN_AS_PROJECT]: {
    request: OpenTicketAsProjectRequest
    response: Project
  }
  // ── Settings ───────────────────────────────────────────────
  [IPC_CHANNELS.GET_OPENAI_KEY]: {
    request: void
    response: string | null
  }
  [IPC_CHANNELS.SET_OPENAI_KEY]: {
    request: { key: string }
    response: void
  }
  [IPC_CHANNELS.GET_CLAUDE_KEY]: {
    request: void
    response: string | null
  }
  [IPC_CHANNELS.SET_CLAUDE_KEY]: {
    request: { key: string }
    response: void
  }
  // ── File Operations ──────────────────────────────────────────
  [IPC_CHANNELS.FILE_CREATE]: {
    request: FileCreateRequest
    response: FileOpsResult
  }
  [IPC_CHANNELS.FILE_READ]: {
    request: FileReadRequest
    response: FileReadResponse
  }
  [IPC_CHANNELS.FILE_WRITE]: {
    request: FileWriteRequest
    response: FileOpsResult
  }
  [IPC_CHANNELS.FILE_LIST]: {
    request: FileListRequest
    response: FileListResponse
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

/** Payload must be a valid CreateProjectFolderRequest */
export function isCreateProjectFolderRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['name'] === 'string' && obj['name'].length > 0
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

/** Payload must be a valid BrowserViewMode */
export function isBrowserViewMode(payload: unknown): boolean {
  return typeof payload === 'string' && (BROWSER_VIEW_MODES as readonly string[]).includes(payload)
}

/** Payload must be a valid SetProjectBrowserRequest */
export function isSetProjectBrowserRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  if (typeof obj['id'] !== 'string' || obj['id'].length === 0) return false
  // browserUrl: optional string or null
  if (obj['browserUrl'] !== undefined && obj['browserUrl'] !== null) {
    if (typeof obj['browserUrl'] !== 'string') return false
  }
  // browserViewMode: optional valid mode or null
  if (obj['browserViewMode'] !== undefined && obj['browserViewMode'] !== null) {
    if (!isBrowserViewMode(obj['browserViewMode'])) return false
  }
  return true
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
  [IPC_CHANNELS.CREATE_PROJECT_FOLDER]: isCreateProjectFolderRequest,
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
  [IPC_CHANNELS.SET_PROJECT_BROWSER]: isSetProjectBrowserRequest,
  // ── Kanban / Ralph Loop ──────────────────────────────────
  [IPC_CHANNELS.TICKET_GET_ALL]: isVoid,
  [IPC_CHANNELS.TICKET_CREATE]: isCreateTicketRequest,
  [IPC_CHANNELS.TICKET_UPDATE]: isUpdateTicketRequest,
  [IPC_CHANNELS.TICKET_DELETE]: isNonEmptyString,
  [IPC_CHANNELS.TICKET_TRANSITION]: isTransitionTicketRequest,
  [IPC_CHANNELS.TICKET_REORDER]: isReorderTicketRequest,
  [IPC_CHANNELS.PRD_GENERATE]: isGeneratePRDRequest,
  [IPC_CHANNELS.PRD_APPROVE]: isApprovePRDRequest,
  [IPC_CHANNELS.PRD_REJECT]: isApprovePRDRequest,
  [IPC_CHANNELS.RALPH_EXECUTE]: isRalphExecuteRequest,
  [IPC_CHANNELS.RALPH_STATUS]: isRalphStatusRequest,
  [IPC_CHANNELS.RALPH_STOP]: isRalphStopRequest,
  [IPC_CHANNELS.RALPH_CHOOSE_WORKTREE_DIR]: isVoid,
  [IPC_CHANNELS.TICKET_OPEN_AS_PROJECT]: isOpenTicketAsProjectRequest,
  // ── Settings ───────────────────────────────────────────────
  [IPC_CHANNELS.GET_OPENAI_KEY]: isVoid,
  [IPC_CHANNELS.SET_OPENAI_KEY]: (p: unknown): p is { key: string } =>
    typeof p === 'object' &&
    p !== null &&
    'key' in p &&
    typeof (p as Record<string, unknown>).key === 'string',
  [IPC_CHANNELS.GET_CLAUDE_KEY]: isVoid,
  [IPC_CHANNELS.SET_CLAUDE_KEY]: (p: unknown): p is { key: string } =>
    typeof p === 'object' &&
    p !== null &&
    'key' in p &&
    typeof (p as Record<string, unknown>).key === 'string',
  // ── File Operations ──────────────────────────────────────────
  [IPC_CHANNELS.FILE_CREATE]: isFileCreateRequest,
  [IPC_CHANNELS.FILE_READ]: isFileReadRequest,
  [IPC_CHANNELS.FILE_WRITE]: isFileWriteRequest,
  [IPC_CHANNELS.FILE_LIST]: isFileListRequest,
}

// ── Validation Helpers ─────────────────────────────────────────

// Re-export ticket validators for test access
export {
  isCreateTicketRequest,
  isUpdateTicketRequest,
  isTransitionTicketRequest,
  isReorderTicketRequest,
  isGeneratePRDRequest,
  isApprovePRDRequest,
  isRalphExecuteRequest,
  isRalphStatusRequest,
  isRalphStopRequest,
  isOpenTicketAsProjectRequest,
} from './ticketValidators'

export {
  isFileCreateRequest,
  isFileReadRequest,
  isFileWriteRequest,
  isFileListRequest,
} from './fileOpsValidators'

/** Check if a channel string is in the allowlist */
export function isAllowedChannel(channel: string): channel is IPCChannel {
  return ALLOWED_CHANNELS.has(channel)
}

/** Validate a payload against the channel's registered validator */
export function validatePayload(channel: IPCChannel, payload: unknown): boolean {
  return IPC_VALIDATORS[channel](payload)
}
