import { describe, it, expect } from 'vitest'
import {
  isVoid,
  isString,
  isNonEmptyString,
  isAddProjectRequest,
  isThemeId,
  isSetProjectThemeRequest,
  isSetProjectStatusRequest,
  isNativeNotifyRequest,
  isSetPresetsRequest,
  isBrowserNavigateRequest,
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
  isAllowedChannel,
  validatePayload,
  IPC_CHANNELS,
  IPC_VALIDATORS,
  ALLOWED_CHANNELS,
} from '../src/shared/ipcContracts'

// ── Primitive Validators ───────────────────────────────────────

describe('isVoid', () => {
  it('accepts undefined', () => {
    expect(isVoid(undefined)).toBe(true)
  })

  it('rejects null', () => {
    expect(isVoid(null)).toBe(false)
  })

  it('rejects strings', () => {
    expect(isVoid('')).toBe(false)
    expect(isVoid('hello')).toBe(false)
  })

  it('rejects numbers', () => {
    expect(isVoid(0)).toBe(false)
    expect(isVoid(42)).toBe(false)
  })

  it('rejects objects', () => {
    expect(isVoid({})).toBe(false)
    expect(isVoid({ key: 'value' })).toBe(false)
  })

  it('rejects arrays', () => {
    expect(isVoid([])).toBe(false)
    expect(isVoid([1, 2])).toBe(false)
  })

  it('rejects booleans', () => {
    expect(isVoid(true)).toBe(false)
    expect(isVoid(false)).toBe(false)
  })
})

describe('isString', () => {
  it('accepts empty string', () => {
    expect(isString('')).toBe(true)
  })

  it('accepts non-empty string', () => {
    expect(isString('hello')).toBe(true)
  })

  it('rejects non-strings', () => {
    expect(isString(undefined)).toBe(false)
    expect(isString(null)).toBe(false)
    expect(isString(42)).toBe(false)
    expect(isString({})).toBe(false)
    expect(isString([])).toBe(false)
    expect(isString(true)).toBe(false)
  })
})

describe('isNonEmptyString', () => {
  it('accepts non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true)
    expect(isNonEmptyString(' ')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isNonEmptyString('')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isNonEmptyString(undefined)).toBe(false)
    expect(isNonEmptyString(null)).toBe(false)
    expect(isNonEmptyString(42)).toBe(false)
    expect(isNonEmptyString({})).toBe(false)
  })
})

// ── AddProjectRequest Validator ──────────────────────────────

describe('isAddProjectRequest', () => {
  it('accepts valid request with path', () => {
    expect(isAddProjectRequest({ path: '/Users/dev/project' })).toBe(true)
  })

  it('accepts request with extra fields', () => {
    expect(isAddProjectRequest({ path: '/tmp/foo', extra: 'ignored' })).toBe(true)
  })

  it('rejects empty path', () => {
    expect(isAddProjectRequest({ path: '' })).toBe(false)
  })

  it('rejects missing path', () => {
    expect(isAddProjectRequest({})).toBe(false)
  })

  it('rejects non-string path', () => {
    expect(isAddProjectRequest({ path: 42 })).toBe(false)
    expect(isAddProjectRequest({ path: null })).toBe(false)
    expect(isAddProjectRequest({ path: true })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isAddProjectRequest(undefined)).toBe(false)
    expect(isAddProjectRequest(null)).toBe(false)
    expect(isAddProjectRequest('string')).toBe(false)
    expect(isAddProjectRequest(42)).toBe(false)
    expect(isAddProjectRequest([])).toBe(false)
  })
})

// ── Theme Validators ─────────────────────────────────────────

describe('isThemeId', () => {
  it('accepts valid theme ids', () => {
    expect(isThemeId('light')).toBe(true)
    expect(isThemeId('dark')).toBe(true)
  })

  it('rejects invalid strings', () => {
    expect(isThemeId('')).toBe(false)
    expect(isThemeId('blue')).toBe(false)
    expect(isThemeId('LIGHT')).toBe(false)
    expect(isThemeId('Dark')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isThemeId(undefined)).toBe(false)
    expect(isThemeId(null)).toBe(false)
    expect(isThemeId(42)).toBe(false)
    expect(isThemeId({})).toBe(false)
    expect(isThemeId(true)).toBe(false)
  })
})

describe('isSetProjectThemeRequest', () => {
  it('accepts valid request with theme', () => {
    expect(isSetProjectThemeRequest({ id: 'abc-123', theme: 'dark' })).toBe(true)
    expect(isSetProjectThemeRequest({ id: 'abc-123', theme: 'light' })).toBe(true)
  })

  it('accepts null theme (clear override)', () => {
    expect(isSetProjectThemeRequest({ id: 'abc-123', theme: null })).toBe(true)
  })

  it('rejects empty id', () => {
    expect(isSetProjectThemeRequest({ id: '', theme: 'dark' })).toBe(false)
  })

  it('rejects missing id', () => {
    expect(isSetProjectThemeRequest({ theme: 'dark' })).toBe(false)
  })

  it('rejects invalid theme string', () => {
    expect(isSetProjectThemeRequest({ id: 'abc', theme: 'blue' })).toBe(false)
    expect(isSetProjectThemeRequest({ id: 'abc', theme: '' })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isSetProjectThemeRequest(undefined)).toBe(false)
    expect(isSetProjectThemeRequest(null)).toBe(false)
    expect(isSetProjectThemeRequest('string')).toBe(false)
    expect(isSetProjectThemeRequest(42)).toBe(false)
  })
})

// ── SetProjectStatusRequest Validator ────────────────────────

describe('isSetProjectStatusRequest', () => {
  it('accepts valid request with each status', () => {
    expect(isSetProjectStatusRequest({ id: 'abc-123', status: 'idle' })).toBe(true)
    expect(isSetProjectStatusRequest({ id: 'abc-123', status: 'running' })).toBe(true)
    expect(isSetProjectStatusRequest({ id: 'abc-123', status: 'done' })).toBe(true)
    expect(isSetProjectStatusRequest({ id: 'abc-123', status: 'needs_input' })).toBe(true)
  })

  it('rejects empty id', () => {
    expect(isSetProjectStatusRequest({ id: '', status: 'idle' })).toBe(false)
  })

  it('rejects missing id', () => {
    expect(isSetProjectStatusRequest({ status: 'idle' })).toBe(false)
  })

  it('rejects invalid status string', () => {
    expect(isSetProjectStatusRequest({ id: 'abc', status: 'unknown' })).toBe(false)
    expect(isSetProjectStatusRequest({ id: 'abc', status: '' })).toBe(false)
    expect(isSetProjectStatusRequest({ id: 'abc', status: 'IDLE' })).toBe(false)
  })

  it('rejects non-string status', () => {
    expect(isSetProjectStatusRequest({ id: 'abc', status: 42 })).toBe(false)
    expect(isSetProjectStatusRequest({ id: 'abc', status: null })).toBe(false)
    expect(isSetProjectStatusRequest({ id: 'abc', status: true })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isSetProjectStatusRequest(undefined)).toBe(false)
    expect(isSetProjectStatusRequest(null)).toBe(false)
    expect(isSetProjectStatusRequest('string')).toBe(false)
    expect(isSetProjectStatusRequest(42)).toBe(false)
  })
})

// ── NativeNotifyRequest Validator ────────────────────────────

describe('isNativeNotifyRequest', () => {
  it('accepts valid request with title only', () => {
    expect(isNativeNotifyRequest({ title: 'Command completed' })).toBe(true)
  })

  it('accepts valid request with title and body', () => {
    expect(isNativeNotifyRequest({ title: 'Done', body: 'Took 3.2s' })).toBe(true)
  })

  it('accepts request with extra fields', () => {
    expect(isNativeNotifyRequest({ title: 'Done', extra: true })).toBe(true)
  })

  it('rejects empty title', () => {
    expect(isNativeNotifyRequest({ title: '' })).toBe(false)
  })

  it('rejects missing title', () => {
    expect(isNativeNotifyRequest({})).toBe(false)
    expect(isNativeNotifyRequest({ body: 'hello' })).toBe(false)
  })

  it('rejects non-string title', () => {
    expect(isNativeNotifyRequest({ title: 42 })).toBe(false)
    expect(isNativeNotifyRequest({ title: null })).toBe(false)
  })

  it('rejects non-string body', () => {
    expect(isNativeNotifyRequest({ title: 'ok', body: 42 })).toBe(false)
    expect(isNativeNotifyRequest({ title: 'ok', body: true })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isNativeNotifyRequest(undefined)).toBe(false)
    expect(isNativeNotifyRequest(null)).toBe(false)
    expect(isNativeNotifyRequest('string')).toBe(false)
    expect(isNativeNotifyRequest(42)).toBe(false)
    expect(isNativeNotifyRequest([])).toBe(false)
  })
})

// ── SetPresetsRequest Validator ──────────────────────────────

describe('isSetPresetsRequest', () => {
  it('accepts valid request with presets', () => {
    expect(
      isSetPresetsRequest({
        presets: [{ id: 'p1', name: 'Dev', command: 'npm run dev' }],
      }),
    ).toBe(true)
  })

  it('accepts valid request with empty presets array', () => {
    expect(isSetPresetsRequest({ presets: [] })).toBe(true)
  })

  it('accepts request with multiple presets', () => {
    expect(
      isSetPresetsRequest({
        presets: [
          { id: 'p1', name: 'Dev', command: 'npm run dev' },
          { id: 'p2', name: 'Build', command: 'npm run build' },
        ],
      }),
    ).toBe(true)
  })

  it('rejects missing presets', () => {
    expect(isSetPresetsRequest({})).toBe(false)
  })

  it('rejects non-array presets', () => {
    expect(isSetPresetsRequest({ presets: 'not-array' })).toBe(false)
    expect(isSetPresetsRequest({ presets: {} })).toBe(false)
  })

  it('rejects presets with invalid items', () => {
    expect(isSetPresetsRequest({ presets: [{ id: '', name: 'x', command: 'x' }] })).toBe(false)
    expect(isSetPresetsRequest({ presets: [{ id: 'x', name: '', command: 'x' }] })).toBe(false)
    expect(isSetPresetsRequest({ presets: [{ id: 'x', name: 'x', command: '' }] })).toBe(false)
    expect(isSetPresetsRequest({ presets: [null] })).toBe(false)
    expect(isSetPresetsRequest({ presets: ['string'] })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isSetPresetsRequest(undefined)).toBe(false)
    expect(isSetPresetsRequest(null)).toBe(false)
    expect(isSetPresetsRequest('string')).toBe(false)
    expect(isSetPresetsRequest(42)).toBe(false)
  })
})

// ── BrowserNavigateRequest Validator ─────────────────────────

describe('isBrowserNavigateRequest', () => {
  it('accepts valid https URL', () => {
    expect(isBrowserNavigateRequest({ url: 'https://example.com' })).toBe(true)
  })

  it('accepts valid http URL', () => {
    expect(isBrowserNavigateRequest({ url: 'http://localhost:3000' })).toBe(true)
  })

  it('rejects empty url', () => {
    expect(isBrowserNavigateRequest({ url: '' })).toBe(false)
  })

  it('rejects url without protocol', () => {
    expect(isBrowserNavigateRequest({ url: 'example.com' })).toBe(false)
  })

  it('rejects javascript: protocol', () => {
    expect(isBrowserNavigateRequest({ url: 'javascript:alert(1)' })).toBe(false)
  })

  it('rejects file: protocol', () => {
    expect(isBrowserNavigateRequest({ url: 'file:///etc/passwd' })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isBrowserNavigateRequest(undefined)).toBe(false)
    expect(isBrowserNavigateRequest(null)).toBe(false)
    expect(isBrowserNavigateRequest('string')).toBe(false)
    expect(isBrowserNavigateRequest(42)).toBe(false)
  })

  it('rejects missing url', () => {
    expect(isBrowserNavigateRequest({})).toBe(false)
  })
})

// ── Channel Allowlist ──────────────────────────────────────────

describe('isAllowedChannel', () => {
  it('accepts every registered channel', () => {
    for (const channel of Object.values(IPC_CHANNELS)) {
      expect(isAllowedChannel(channel)).toBe(true)
    }
  })

  it('rejects unknown channel strings', () => {
    expect(isAllowedChannel('unknown')).toBe(false)
    expect(isAllowedChannel('')).toBe(false)
    expect(isAllowedChannel('ipc:nonexistent')).toBe(false)
  })

  it('rejects channels with subtle differences', () => {
    expect(isAllowedChannel('ipc:ping ')).toBe(false) // trailing space
    expect(isAllowedChannel('IPC:PING')).toBe(false) // wrong case
    expect(isAllowedChannel('ipc:pin')).toBe(false) // partial
  })
})

describe('ALLOWED_CHANNELS', () => {
  it('contains exactly the declared channels', () => {
    expect(ALLOWED_CHANNELS.size).toBe(Object.keys(IPC_CHANNELS).length)
    for (const channel of Object.values(IPC_CHANNELS)) {
      expect(ALLOWED_CHANNELS.has(channel)).toBe(true)
    }
  })
})

// ── Payload Validation ─────────────────────────────────────────

describe('validatePayload', () => {
  it('accepts undefined for void channels', () => {
    const voidChannels = [
      IPC_CHANNELS.PING,
      IPC_CHANNELS.GET_APP_VERSION,
      IPC_CHANNELS.WINDOW_MINIMIZE,
      IPC_CHANNELS.WINDOW_MAXIMIZE,
      IPC_CHANNELS.WINDOW_CLOSE,
      IPC_CHANNELS.OPEN_FOLDER_DIALOG,
      IPC_CHANNELS.GET_PROJECTS,
      IPC_CHANNELS.GET_GLOBAL_THEME,
      IPC_CHANNELS.GET_PRESETS,
      IPC_CHANNELS.TICKET_GET_ALL,
      IPC_CHANNELS.RALPH_CHOOSE_WORKTREE_DIR,
    ] as const
    for (const channel of voidChannels) {
      expect(validatePayload(channel, undefined)).toBe(true)
    }
  })

  it('rejects non-void payloads on void channels', () => {
    expect(validatePayload(IPC_CHANNELS.PING, 'injection')).toBe(false)
    expect(validatePayload(IPC_CHANNELS.PING, { evil: true })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.PING, 42)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.PING, null)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.WINDOW_CLOSE, 'data')).toBe(false)
    expect(validatePayload(IPC_CHANNELS.GET_APP_VERSION, [])).toBe(false)
  })

  it('validates ADD_PROJECT payload', () => {
    expect(validatePayload(IPC_CHANNELS.ADD_PROJECT, { path: '/tmp/project' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.ADD_PROJECT, { path: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.ADD_PROJECT, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.ADD_PROJECT, 'string')).toBe(false)
  })

  it('validates REMOVE_PROJECT payload', () => {
    expect(validatePayload(IPC_CHANNELS.REMOVE_PROJECT, 'some-uuid')).toBe(true)
    expect(validatePayload(IPC_CHANNELS.REMOVE_PROJECT, '')).toBe(false)
    expect(validatePayload(IPC_CHANNELS.REMOVE_PROJECT, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.REMOVE_PROJECT, 42)).toBe(false)
  })

  it('validates SET_GLOBAL_THEME payload', () => {
    expect(validatePayload(IPC_CHANNELS.SET_GLOBAL_THEME, 'light')).toBe(true)
    expect(validatePayload(IPC_CHANNELS.SET_GLOBAL_THEME, 'dark')).toBe(true)
    expect(validatePayload(IPC_CHANNELS.SET_GLOBAL_THEME, 'blue')).toBe(false)
    expect(validatePayload(IPC_CHANNELS.SET_GLOBAL_THEME, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.SET_GLOBAL_THEME, null)).toBe(false)
  })

  it('validates SET_PROJECT_THEME payload', () => {
    expect(validatePayload(IPC_CHANNELS.SET_PROJECT_THEME, { id: 'x', theme: 'dark' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.SET_PROJECT_THEME, { id: 'x', theme: null })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.SET_PROJECT_THEME, { id: '', theme: 'dark' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.SET_PROJECT_THEME, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.SET_PROJECT_THEME, 'string')).toBe(false)
  })

  it('validates SET_PROJECT_STATUS payload', () => {
    expect(validatePayload(IPC_CHANNELS.SET_PROJECT_STATUS, { id: 'x', status: 'running' })).toBe(
      true,
    )
    expect(validatePayload(IPC_CHANNELS.SET_PROJECT_STATUS, { id: 'x', status: 'done' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.SET_PROJECT_STATUS, { id: '', status: 'idle' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.SET_PROJECT_STATUS, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.SET_PROJECT_STATUS, 'string')).toBe(false)
  })

  it('validates NATIVE_NOTIFY payload', () => {
    expect(validatePayload(IPC_CHANNELS.NATIVE_NOTIFY, { title: 'Done' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.NATIVE_NOTIFY, { title: 'Done', body: '3s' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.NATIVE_NOTIFY, { title: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.NATIVE_NOTIFY, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.NATIVE_NOTIFY, 'string')).toBe(false)
  })

  it('validates GET_PRESETS payload', () => {
    expect(validatePayload(IPC_CHANNELS.GET_PRESETS, undefined)).toBe(true)
    expect(validatePayload(IPC_CHANNELS.GET_PRESETS, { projectId: 'abc' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.GET_PRESETS, 'string')).toBe(false)
  })

  it('validates BROWSER_NAVIGATE payload', () => {
    expect(validatePayload(IPC_CHANNELS.BROWSER_NAVIGATE, { url: 'https://example.com' })).toBe(
      true,
    )
    expect(validatePayload(IPC_CHANNELS.BROWSER_NAVIGATE, { url: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.BROWSER_NAVIGATE, { url: 'ftp://bad' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.BROWSER_NAVIGATE, undefined)).toBe(false)
  })

  it('validates SET_PRESETS payload', () => {
    expect(
      validatePayload(IPC_CHANNELS.SET_PRESETS, {
        presets: [{ id: 'p1', name: 'Dev', command: 'npm run dev' }],
      }),
    ).toBe(true)
    expect(validatePayload(IPC_CHANNELS.SET_PRESETS, { presets: [] })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.SET_PRESETS, {})).toBe(false)
    expect(validatePayload(IPC_CHANNELS.SET_PRESETS, undefined)).toBe(false)
  })

  // ── Kanban / Ralph Loop validatePayload ──────────────────────

  it('validates TICKET_GET_ALL as void', () => {
    expect(validatePayload(IPC_CHANNELS.TICKET_GET_ALL, undefined)).toBe(true)
    expect(validatePayload(IPC_CHANNELS.TICKET_GET_ALL, 'injection')).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_GET_ALL, {})).toBe(false)
  })

  it('validates RALPH_CHOOSE_WORKTREE_DIR as void', () => {
    expect(validatePayload(IPC_CHANNELS.RALPH_CHOOSE_WORKTREE_DIR, undefined)).toBe(true)
    expect(validatePayload(IPC_CHANNELS.RALPH_CHOOSE_WORKTREE_DIR, 'injection')).toBe(false)
    expect(validatePayload(IPC_CHANNELS.RALPH_CHOOSE_WORKTREE_DIR, {})).toBe(false)
  })

  it('validates TICKET_CREATE payload', () => {
    expect(
      validatePayload(IPC_CHANNELS.TICKET_CREATE, {
        title: 'Bug fix',
        description: 'Fix crash',
        acceptanceCriteria: ['No crash'],
        type: 'bug',
        priority: 'high',
        projectId: null,
      }),
    ).toBe(true)
    expect(validatePayload(IPC_CHANNELS.TICKET_CREATE, { title: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_CREATE, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_CREATE, 'string')).toBe(false)
  })

  it('validates TICKET_UPDATE payload', () => {
    expect(validatePayload(IPC_CHANNELS.TICKET_UPDATE, { id: 'ticket-1', title: 'Updated' })).toBe(
      true,
    )
    expect(validatePayload(IPC_CHANNELS.TICKET_UPDATE, { id: 'ticket-1' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.TICKET_UPDATE, { id: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_UPDATE, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_UPDATE, 'string')).toBe(false)
  })

  it('validates TICKET_DELETE payload', () => {
    expect(validatePayload(IPC_CHANNELS.TICKET_DELETE, 'ticket-uuid')).toBe(true)
    expect(validatePayload(IPC_CHANNELS.TICKET_DELETE, '')).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_DELETE, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_DELETE, 42)).toBe(false)
  })

  it('validates TICKET_TRANSITION payload', () => {
    expect(
      validatePayload(IPC_CHANNELS.TICKET_TRANSITION, { id: 'ticket-1', status: 'in_progress' }),
    ).toBe(true)
    expect(
      validatePayload(IPC_CHANNELS.TICKET_TRANSITION, { id: 'ticket-1', status: 'unknown' }),
    ).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_TRANSITION, { id: '', status: 'backlog' })).toBe(
      false,
    )
    expect(validatePayload(IPC_CHANNELS.TICKET_TRANSITION, undefined)).toBe(false)
  })

  it('validates TICKET_REORDER payload', () => {
    expect(
      validatePayload(IPC_CHANNELS.TICKET_REORDER, {
        id: 'ticket-1',
        status: 'backlog',
        index: 0,
      }),
    ).toBe(true)
    expect(
      validatePayload(IPC_CHANNELS.TICKET_REORDER, {
        id: 'ticket-1',
        status: 'backlog',
        index: -1,
      }),
    ).toBe(false)
    expect(
      validatePayload(IPC_CHANNELS.TICKET_REORDER, { id: '', status: 'backlog', index: 0 }),
    ).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_REORDER, undefined)).toBe(false)
  })

  it('validates PRD_GENERATE payload', () => {
    expect(validatePayload(IPC_CHANNELS.PRD_GENERATE, { ticketId: 'ticket-1' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.PRD_GENERATE, { ticketId: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.PRD_GENERATE, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.PRD_GENERATE, 'string')).toBe(false)
  })

  it('validates PRD_APPROVE payload', () => {
    expect(validatePayload(IPC_CHANNELS.PRD_APPROVE, { ticketId: 'ticket-1' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.PRD_APPROVE, { ticketId: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.PRD_APPROVE, undefined)).toBe(false)
  })

  it('validates PRD_REJECT payload', () => {
    expect(validatePayload(IPC_CHANNELS.PRD_REJECT, { ticketId: 'ticket-1' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.PRD_REJECT, { ticketId: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.PRD_REJECT, undefined)).toBe(false)
  })

  it('validates RALPH_EXECUTE payload', () => {
    expect(validatePayload(IPC_CHANNELS.RALPH_EXECUTE, { ticketId: 'ticket-1' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.RALPH_EXECUTE, { ticketId: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.RALPH_EXECUTE, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.RALPH_EXECUTE, 'string')).toBe(false)
  })

  it('validates RALPH_STATUS payload', () => {
    expect(validatePayload(IPC_CHANNELS.RALPH_STATUS, { ticketId: 'ticket-1' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.RALPH_STATUS, { ticketId: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.RALPH_STATUS, undefined)).toBe(false)
  })

  it('validates RALPH_STOP payload', () => {
    expect(validatePayload(IPC_CHANNELS.RALPH_STOP, { ticketId: 'ticket-1' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.RALPH_STOP, { ticketId: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.RALPH_STOP, undefined)).toBe(false)
  })

  it('validates TICKET_OPEN_AS_PROJECT payload', () => {
    expect(validatePayload(IPC_CHANNELS.TICKET_OPEN_AS_PROJECT, { ticketId: 'ticket-1' })).toBe(
      true,
    )
    expect(validatePayload(IPC_CHANNELS.TICKET_OPEN_AS_PROJECT, { ticketId: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_OPEN_AS_PROJECT, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TICKET_OPEN_AS_PROJECT, 'string')).toBe(false)
  })
})

// ── Registry Completeness ──────────────────────────────────────

describe('IPC_VALIDATORS registry', () => {
  it('has a function for every channel', () => {
    for (const channel of Object.values(IPC_CHANNELS)) {
      expect(typeof IPC_VALIDATORS[channel]).toBe('function')
    }
  })

  it('has no extra entries', () => {
    const validatorKeys = Object.keys(IPC_VALIDATORS)
    const channelValues = Object.values(IPC_CHANNELS) as string[]
    expect(validatorKeys.sort()).toEqual(channelValues.sort())
  })
})

// ── CreateTicketRequest Validator ──────────────────────────────

describe('isCreateTicketRequest', () => {
  const valid = {
    title: 'Add dark mode',
    description: 'Implement dark mode toggle',
    acceptanceCriteria: ['Toggle works', 'Persists across reload'],
    type: 'feature' as const,
    priority: 'high' as const,
    projectId: 'proj-123',
  }

  it('accepts valid request with all fields', () => {
    expect(isCreateTicketRequest(valid)).toBe(true)
  })

  it('accepts null projectId', () => {
    expect(isCreateTicketRequest({ ...valid, projectId: null })).toBe(true)
  })

  it('accepts empty acceptanceCriteria array', () => {
    expect(isCreateTicketRequest({ ...valid, acceptanceCriteria: [] })).toBe(true)
  })

  it('accepts all valid ticket types', () => {
    for (const t of ['feature', 'bug', 'chore', 'spike']) {
      expect(isCreateTicketRequest({ ...valid, type: t })).toBe(true)
    }
  })

  it('accepts all valid priorities', () => {
    for (const p of ['low', 'medium', 'high', 'critical']) {
      expect(isCreateTicketRequest({ ...valid, priority: p })).toBe(true)
    }
  })

  it('rejects empty title', () => {
    expect(isCreateTicketRequest({ ...valid, title: '' })).toBe(false)
  })

  it('rejects missing title', () => {
    expect(
      isCreateTicketRequest({
        description: valid.description,
        acceptanceCriteria: valid.acceptanceCriteria,
        type: valid.type,
        priority: valid.priority,
        projectId: valid.projectId,
      }),
    ).toBe(false)
  })

  it('rejects non-string description', () => {
    expect(isCreateTicketRequest({ ...valid, description: 42 })).toBe(false)
    expect(isCreateTicketRequest({ ...valid, description: null })).toBe(false)
  })

  it('rejects non-array acceptanceCriteria', () => {
    expect(isCreateTicketRequest({ ...valid, acceptanceCriteria: 'string' })).toBe(false)
    expect(isCreateTicketRequest({ ...valid, acceptanceCriteria: {} })).toBe(false)
  })

  it('rejects acceptanceCriteria with non-string items', () => {
    expect(isCreateTicketRequest({ ...valid, acceptanceCriteria: [42] })).toBe(false)
    expect(isCreateTicketRequest({ ...valid, acceptanceCriteria: [null] })).toBe(false)
  })

  it('rejects invalid ticket type', () => {
    expect(isCreateTicketRequest({ ...valid, type: 'epic' })).toBe(false)
    expect(isCreateTicketRequest({ ...valid, type: '' })).toBe(false)
    expect(isCreateTicketRequest({ ...valid, type: 'FEATURE' })).toBe(false)
  })

  it('rejects invalid priority', () => {
    expect(isCreateTicketRequest({ ...valid, priority: 'urgent' })).toBe(false)
    expect(isCreateTicketRequest({ ...valid, priority: '' })).toBe(false)
    expect(isCreateTicketRequest({ ...valid, priority: 'HIGH' })).toBe(false)
  })

  it('rejects non-string/non-null projectId', () => {
    expect(isCreateTicketRequest({ ...valid, projectId: 42 })).toBe(false)
    expect(isCreateTicketRequest({ ...valid, projectId: true })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isCreateTicketRequest(undefined)).toBe(false)
    expect(isCreateTicketRequest(null)).toBe(false)
    expect(isCreateTicketRequest('string')).toBe(false)
    expect(isCreateTicketRequest(42)).toBe(false)
    expect(isCreateTicketRequest([])).toBe(false)
  })
})

// ── UpdateTicketRequest Validator ──────────────────────────────

describe('isUpdateTicketRequest', () => {
  it('accepts valid request with only id', () => {
    expect(isUpdateTicketRequest({ id: 'ticket-1' })).toBe(true)
  })

  it('accepts request with all optional fields', () => {
    expect(
      isUpdateTicketRequest({
        id: 'ticket-1',
        title: 'Updated title',
        description: 'Updated desc',
        acceptanceCriteria: ['AC1'],
        type: 'bug',
        priority: 'critical',
        projectId: 'proj-1',
      }),
    ).toBe(true)
  })

  it('accepts null projectId', () => {
    expect(isUpdateTicketRequest({ id: 'ticket-1', projectId: null })).toBe(true)
  })

  it('accepts all valid ticket types', () => {
    for (const t of ['feature', 'bug', 'chore', 'spike']) {
      expect(isUpdateTicketRequest({ id: 'ticket-1', type: t })).toBe(true)
    }
  })

  it('accepts all valid priorities', () => {
    for (const p of ['low', 'medium', 'high', 'critical']) {
      expect(isUpdateTicketRequest({ id: 'ticket-1', priority: p })).toBe(true)
    }
  })

  it('rejects empty id', () => {
    expect(isUpdateTicketRequest({ id: '' })).toBe(false)
  })

  it('rejects missing id', () => {
    expect(isUpdateTicketRequest({ title: 'No id' })).toBe(false)
    expect(isUpdateTicketRequest({})).toBe(false)
  })

  it('rejects empty title when provided', () => {
    expect(isUpdateTicketRequest({ id: 'ticket-1', title: '' })).toBe(false)
  })

  it('rejects non-string description when provided', () => {
    expect(isUpdateTicketRequest({ id: 'ticket-1', description: 42 })).toBe(false)
  })

  it('rejects non-array acceptanceCriteria when provided', () => {
    expect(isUpdateTicketRequest({ id: 'ticket-1', acceptanceCriteria: 'string' })).toBe(false)
  })

  it('rejects acceptanceCriteria with non-string items', () => {
    expect(isUpdateTicketRequest({ id: 'ticket-1', acceptanceCriteria: [42] })).toBe(false)
  })

  it('rejects invalid type when provided', () => {
    expect(isUpdateTicketRequest({ id: 'ticket-1', type: 'epic' })).toBe(false)
    expect(isUpdateTicketRequest({ id: 'ticket-1', type: '' })).toBe(false)
  })

  it('rejects invalid priority when provided', () => {
    expect(isUpdateTicketRequest({ id: 'ticket-1', priority: 'urgent' })).toBe(false)
    expect(isUpdateTicketRequest({ id: 'ticket-1', priority: '' })).toBe(false)
  })

  it('rejects non-string/non-null projectId when provided', () => {
    expect(isUpdateTicketRequest({ id: 'ticket-1', projectId: 42 })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isUpdateTicketRequest(undefined)).toBe(false)
    expect(isUpdateTicketRequest(null)).toBe(false)
    expect(isUpdateTicketRequest('string')).toBe(false)
    expect(isUpdateTicketRequest(42)).toBe(false)
    expect(isUpdateTicketRequest([])).toBe(false)
  })
})

// ── TransitionTicketRequest Validator ──────────────────────────

describe('isTransitionTicketRequest', () => {
  it('accepts valid request with each status', () => {
    const statuses = ['backlog', 'up_next', 'in_review', 'in_progress', 'in_testing', 'completed']
    for (const s of statuses) {
      expect(isTransitionTicketRequest({ id: 'ticket-1', status: s })).toBe(true)
    }
  })

  it('rejects empty id', () => {
    expect(isTransitionTicketRequest({ id: '', status: 'backlog' })).toBe(false)
  })

  it('rejects missing id', () => {
    expect(isTransitionTicketRequest({ status: 'backlog' })).toBe(false)
  })

  it('rejects invalid status', () => {
    expect(isTransitionTicketRequest({ id: 'ticket-1', status: 'unknown' })).toBe(false)
    expect(isTransitionTicketRequest({ id: 'ticket-1', status: '' })).toBe(false)
    expect(isTransitionTicketRequest({ id: 'ticket-1', status: 'BACKLOG' })).toBe(false)
  })

  it('rejects non-string status', () => {
    expect(isTransitionTicketRequest({ id: 'ticket-1', status: 42 })).toBe(false)
    expect(isTransitionTicketRequest({ id: 'ticket-1', status: null })).toBe(false)
    expect(isTransitionTicketRequest({ id: 'ticket-1', status: true })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isTransitionTicketRequest(undefined)).toBe(false)
    expect(isTransitionTicketRequest(null)).toBe(false)
    expect(isTransitionTicketRequest('string')).toBe(false)
    expect(isTransitionTicketRequest(42)).toBe(false)
  })
})

// ── ReorderTicketRequest Validator ─────────────────────────────

describe('isReorderTicketRequest', () => {
  it('accepts valid request', () => {
    expect(isReorderTicketRequest({ id: 'ticket-1', status: 'backlog', index: 0 })).toBe(true)
    expect(isReorderTicketRequest({ id: 'ticket-1', status: 'completed', index: 5 })).toBe(true)
  })

  it('accepts all valid statuses', () => {
    const statuses = ['backlog', 'up_next', 'in_review', 'in_progress', 'in_testing', 'completed']
    for (const s of statuses) {
      expect(isReorderTicketRequest({ id: 'ticket-1', status: s, index: 0 })).toBe(true)
    }
  })

  it('rejects empty id', () => {
    expect(isReorderTicketRequest({ id: '', status: 'backlog', index: 0 })).toBe(false)
  })

  it('rejects missing id', () => {
    expect(isReorderTicketRequest({ status: 'backlog', index: 0 })).toBe(false)
  })

  it('rejects invalid status', () => {
    expect(isReorderTicketRequest({ id: 'ticket-1', status: 'unknown', index: 0 })).toBe(false)
    expect(isReorderTicketRequest({ id: 'ticket-1', status: '', index: 0 })).toBe(false)
  })

  it('rejects negative index', () => {
    expect(isReorderTicketRequest({ id: 'ticket-1', status: 'backlog', index: -1 })).toBe(false)
  })

  it('rejects non-number index', () => {
    expect(isReorderTicketRequest({ id: 'ticket-1', status: 'backlog', index: '0' })).toBe(false)
    expect(isReorderTicketRequest({ id: 'ticket-1', status: 'backlog', index: null })).toBe(false)
  })

  it('rejects missing index', () => {
    expect(isReorderTicketRequest({ id: 'ticket-1', status: 'backlog' })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isReorderTicketRequest(undefined)).toBe(false)
    expect(isReorderTicketRequest(null)).toBe(false)
    expect(isReorderTicketRequest('string')).toBe(false)
    expect(isReorderTicketRequest(42)).toBe(false)
  })
})

// ── GeneratePRDRequest Validator ───────────────────────────────

describe('isGeneratePRDRequest', () => {
  it('accepts valid request', () => {
    expect(isGeneratePRDRequest({ ticketId: 'ticket-1' })).toBe(true)
  })

  it('accepts request with extra fields', () => {
    expect(isGeneratePRDRequest({ ticketId: 'ticket-1', extra: true })).toBe(true)
  })

  it('rejects empty ticketId', () => {
    expect(isGeneratePRDRequest({ ticketId: '' })).toBe(false)
  })

  it('rejects missing ticketId', () => {
    expect(isGeneratePRDRequest({})).toBe(false)
  })

  it('rejects non-string ticketId', () => {
    expect(isGeneratePRDRequest({ ticketId: 42 })).toBe(false)
    expect(isGeneratePRDRequest({ ticketId: null })).toBe(false)
    expect(isGeneratePRDRequest({ ticketId: true })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isGeneratePRDRequest(undefined)).toBe(false)
    expect(isGeneratePRDRequest(null)).toBe(false)
    expect(isGeneratePRDRequest('string')).toBe(false)
    expect(isGeneratePRDRequest(42)).toBe(false)
    expect(isGeneratePRDRequest([])).toBe(false)
  })
})

// ── ApprovePRDRequest Validator ────────────────────────────────

describe('isApprovePRDRequest', () => {
  it('accepts valid request', () => {
    expect(isApprovePRDRequest({ ticketId: 'ticket-1' })).toBe(true)
  })

  it('accepts request with extra fields', () => {
    expect(isApprovePRDRequest({ ticketId: 'ticket-1', extra: true })).toBe(true)
  })

  it('rejects empty ticketId', () => {
    expect(isApprovePRDRequest({ ticketId: '' })).toBe(false)
  })

  it('rejects missing ticketId', () => {
    expect(isApprovePRDRequest({})).toBe(false)
  })

  it('rejects non-string ticketId', () => {
    expect(isApprovePRDRequest({ ticketId: 42 })).toBe(false)
    expect(isApprovePRDRequest({ ticketId: null })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isApprovePRDRequest(undefined)).toBe(false)
    expect(isApprovePRDRequest(null)).toBe(false)
    expect(isApprovePRDRequest('string')).toBe(false)
    expect(isApprovePRDRequest(42)).toBe(false)
    expect(isApprovePRDRequest([])).toBe(false)
  })
})

// ── RalphExecuteRequest Validator ──────────────────────────────

describe('isRalphExecuteRequest', () => {
  it('accepts valid request', () => {
    expect(isRalphExecuteRequest({ ticketId: 'ticket-1' })).toBe(true)
  })

  it('accepts request with extra fields', () => {
    expect(isRalphExecuteRequest({ ticketId: 'ticket-1', extra: true })).toBe(true)
  })

  it('rejects empty ticketId', () => {
    expect(isRalphExecuteRequest({ ticketId: '' })).toBe(false)
  })

  it('rejects missing ticketId', () => {
    expect(isRalphExecuteRequest({})).toBe(false)
  })

  it('rejects non-string ticketId', () => {
    expect(isRalphExecuteRequest({ ticketId: 42 })).toBe(false)
    expect(isRalphExecuteRequest({ ticketId: null })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isRalphExecuteRequest(undefined)).toBe(false)
    expect(isRalphExecuteRequest(null)).toBe(false)
    expect(isRalphExecuteRequest('string')).toBe(false)
    expect(isRalphExecuteRequest(42)).toBe(false)
    expect(isRalphExecuteRequest([])).toBe(false)
  })
})

// ── RalphStatusRequest Validator ───────────────────────────────

describe('isRalphStatusRequest', () => {
  it('accepts valid request', () => {
    expect(isRalphStatusRequest({ ticketId: 'ticket-1' })).toBe(true)
  })

  it('accepts request with extra fields', () => {
    expect(isRalphStatusRequest({ ticketId: 'ticket-1', extra: true })).toBe(true)
  })

  it('rejects empty ticketId', () => {
    expect(isRalphStatusRequest({ ticketId: '' })).toBe(false)
  })

  it('rejects missing ticketId', () => {
    expect(isRalphStatusRequest({})).toBe(false)
  })

  it('rejects non-string ticketId', () => {
    expect(isRalphStatusRequest({ ticketId: 42 })).toBe(false)
    expect(isRalphStatusRequest({ ticketId: null })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isRalphStatusRequest(undefined)).toBe(false)
    expect(isRalphStatusRequest(null)).toBe(false)
    expect(isRalphStatusRequest('string')).toBe(false)
    expect(isRalphStatusRequest(42)).toBe(false)
    expect(isRalphStatusRequest([])).toBe(false)
  })
})

// ── RalphStopRequest Validator ─────────────────────────────────

describe('isRalphStopRequest', () => {
  it('accepts valid request', () => {
    expect(isRalphStopRequest({ ticketId: 'ticket-1' })).toBe(true)
  })

  it('accepts request with extra fields', () => {
    expect(isRalphStopRequest({ ticketId: 'ticket-1', extra: true })).toBe(true)
  })

  it('rejects empty ticketId', () => {
    expect(isRalphStopRequest({ ticketId: '' })).toBe(false)
  })

  it('rejects missing ticketId', () => {
    expect(isRalphStopRequest({})).toBe(false)
  })

  it('rejects non-string ticketId', () => {
    expect(isRalphStopRequest({ ticketId: 42 })).toBe(false)
    expect(isRalphStopRequest({ ticketId: null })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isRalphStopRequest(undefined)).toBe(false)
    expect(isRalphStopRequest(null)).toBe(false)
    expect(isRalphStopRequest('string')).toBe(false)
    expect(isRalphStopRequest(42)).toBe(false)
    expect(isRalphStopRequest([])).toBe(false)
  })
})

// ── OpenTicketAsProjectRequest Validator ────────────────────────

describe('isOpenTicketAsProjectRequest', () => {
  it('accepts valid request', () => {
    expect(isOpenTicketAsProjectRequest({ ticketId: 'ticket-1' })).toBe(true)
  })

  it('accepts request with extra fields', () => {
    expect(isOpenTicketAsProjectRequest({ ticketId: 'ticket-1', extra: true })).toBe(true)
  })

  it('rejects empty ticketId', () => {
    expect(isOpenTicketAsProjectRequest({ ticketId: '' })).toBe(false)
  })

  it('rejects missing ticketId', () => {
    expect(isOpenTicketAsProjectRequest({})).toBe(false)
  })

  it('rejects non-string ticketId', () => {
    expect(isOpenTicketAsProjectRequest({ ticketId: 42 })).toBe(false)
    expect(isOpenTicketAsProjectRequest({ ticketId: null })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isOpenTicketAsProjectRequest(undefined)).toBe(false)
    expect(isOpenTicketAsProjectRequest(null)).toBe(false)
    expect(isOpenTicketAsProjectRequest('string')).toBe(false)
    expect(isOpenTicketAsProjectRequest(42)).toBe(false)
    expect(isOpenTicketAsProjectRequest([])).toBe(false)
  })
})
