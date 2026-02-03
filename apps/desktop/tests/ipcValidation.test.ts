import { describe, it, expect } from 'vitest'
import {
  isVoid,
  isString,
  isNonEmptyString,
  isAddProjectRequest,
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
