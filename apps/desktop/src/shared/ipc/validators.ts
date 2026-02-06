import { THEME_IDS, PROJECT_STATUSES, BROWSER_VIEW_MODES } from '../types'
import { isValidLayout } from '../terminalLayout'
import { IPC_CHANNELS, type IPCChannel, ALLOWED_CHANNELS } from './channels'
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
} from '../ticketValidators'
import {
  isFileCreateRequest,
  isFileReadRequest,
  isFileWriteRequest,
  isFileListRequest,
} from '../fileOpsValidators'
import {
  isCreateMobileAppRequest,
  isAddMobileAppRequest,
  isStartExpoRequest,
  isStopExpoRequest,
  isExpoStatusRequest,
  isOpenMobileAppAsProjectRequest,
  isGenerateMobilePRDRequest,
  isSavePRDRequest,
  isCopyPRDImagesRequest,
} from '../expoValidators'
import { isGenerateWordVomitPRDRequest } from '../wordVomitValidators'
import { isCreateIdeaRequest, isUpdateIdeaRequest } from '../ideaValidators'
import {
  isPortCheckRequest,
  isPortFindAvailableRequest,
  isPortRegisterRequest,
  isPortUnregisterRequest,
  isPortGetOwnerRequest,
} from '../portValidators'

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
  // ── App Builder / Expo ────────────────────────────────────
  [IPC_CHANNELS.EXPO_GET_ALL]: isVoid,
  [IPC_CHANNELS.EXPO_CREATE]: isCreateMobileAppRequest,
  [IPC_CHANNELS.EXPO_ADD]: isAddMobileAppRequest,
  [IPC_CHANNELS.EXPO_REMOVE]: isNonEmptyString,
  [IPC_CHANNELS.EXPO_START]: isStartExpoRequest,
  [IPC_CHANNELS.EXPO_STOP]: isStopExpoRequest,
  [IPC_CHANNELS.EXPO_STATUS]: isExpoStatusRequest,
  [IPC_CHANNELS.EXPO_OPEN_FOLDER_DIALOG]: isVoid,
  [IPC_CHANNELS.EXPO_CHOOSE_PARENT_DIR]: isVoid,
  [IPC_CHANNELS.EXPO_OPEN_AS_PROJECT]: isOpenMobileAppAsProjectRequest,
  // ── App Builder Enhancement ─────────────────────────────
  [IPC_CHANNELS.EXPO_TEMPLATE_STATUS]: isVoid,
  [IPC_CHANNELS.EXPO_REFRESH_TEMPLATES]: isVoid,
  [IPC_CHANNELS.EXPO_ENSURE_TEMPLATES]: isVoid,
  [IPC_CHANNELS.EXPO_GENERATE_PRD]: isGenerateMobilePRDRequest,
  [IPC_CHANNELS.EXPO_API_KEY_STATUS]: isVoid,
  [IPC_CHANNELS.EXPO_SAVE_PRD]: isSavePRDRequest,
  [IPC_CHANNELS.EXPO_COPY_PRD_IMAGES]: isCopyPRDImagesRequest,
  // ── Word Vomit ────────────────────────────────────────────
  [IPC_CHANNELS.WORD_VOMIT_GENERATE_PRD]: isGenerateWordVomitPRDRequest,
  // ── Idea Log ──────────────────────────────────────────────
  [IPC_CHANNELS.IDEA_GET_ALL]: isVoid,
  [IPC_CHANNELS.IDEA_CREATE]: isCreateIdeaRequest,
  [IPC_CHANNELS.IDEA_UPDATE]: isUpdateIdeaRequest,
  [IPC_CHANNELS.IDEA_DELETE]: isNonEmptyString,
  [IPC_CHANNELS.IDEA_DELETE_BY_PROJECT]: isNonEmptyString,
  // ── Port Service ────────────────────────────────────────────
  [IPC_CHANNELS.PORT_CHECK]: isPortCheckRequest,
  [IPC_CHANNELS.PORT_FIND_AVAILABLE]: isPortFindAvailableRequest,
  [IPC_CHANNELS.PORT_REGISTER]: isPortRegisterRequest,
  [IPC_CHANNELS.PORT_UNREGISTER]: isPortUnregisterRequest,
  [IPC_CHANNELS.PORT_GET_OWNER]: isPortGetOwnerRequest,
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
