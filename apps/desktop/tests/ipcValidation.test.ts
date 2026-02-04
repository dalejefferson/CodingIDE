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
