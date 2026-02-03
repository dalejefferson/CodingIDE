import { describe, it, expect } from 'vitest'
import {
  isTerminalCreateRequest,
  isTerminalWriteRequest,
  isTerminalResizeRequest,
  isTerminalKillRequest,
  isTerminalLayoutRequest,
  isTerminalSetLayoutRequest,
  isGitBranchRequest,
  validatePayload,
  IPC_CHANNELS,
} from '../src/shared/ipcContracts'

// ── TerminalCreateRequest ────────────────────────────────────

describe('isTerminalCreateRequest', () => {
  it('accepts valid request', () => {
    expect(
      isTerminalCreateRequest({
        projectId: 'p1',
        terminalId: 't1',
        cwd: '/Users/test',
      }),
    ).toBe(true)
  })

  it('accepts request with optional cols/rows', () => {
    expect(
      isTerminalCreateRequest({
        projectId: 'p1',
        terminalId: 't1',
        cwd: '/Users/test',
        cols: 80,
        rows: 24,
      }),
    ).toBe(true)
  })

  it('rejects missing projectId', () => {
    expect(isTerminalCreateRequest({ terminalId: 't1', cwd: '/tmp' })).toBe(false)
  })

  it('rejects empty terminalId', () => {
    expect(isTerminalCreateRequest({ projectId: 'p1', terminalId: '', cwd: '/tmp' })).toBe(false)
  })

  it('rejects empty cwd', () => {
    expect(isTerminalCreateRequest({ projectId: 'p1', terminalId: 't1', cwd: '' })).toBe(false)
  })

  it('rejects invalid cols', () => {
    expect(
      isTerminalCreateRequest({ projectId: 'p1', terminalId: 't1', cwd: '/tmp', cols: 0 }),
    ).toBe(false)
    expect(
      isTerminalCreateRequest({ projectId: 'p1', terminalId: 't1', cwd: '/tmp', cols: -1 }),
    ).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isTerminalCreateRequest(null)).toBe(false)
    expect(isTerminalCreateRequest(undefined)).toBe(false)
    expect(isTerminalCreateRequest('string')).toBe(false)
  })
})

// ── TerminalWriteRequest ─────────────────────────────────────

describe('isTerminalWriteRequest', () => {
  it('accepts valid request', () => {
    expect(isTerminalWriteRequest({ terminalId: 't1', data: 'ls\n' })).toBe(true)
  })

  it('accepts empty data string', () => {
    expect(isTerminalWriteRequest({ terminalId: 't1', data: '' })).toBe(true)
  })

  it('rejects empty terminalId', () => {
    expect(isTerminalWriteRequest({ terminalId: '', data: 'test' })).toBe(false)
  })

  it('rejects missing data', () => {
    expect(isTerminalWriteRequest({ terminalId: 't1' })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isTerminalWriteRequest(null)).toBe(false)
    expect(isTerminalWriteRequest(42)).toBe(false)
  })
})

// ── TerminalResizeRequest ────────────────────────────────────

describe('isTerminalResizeRequest', () => {
  it('accepts valid request', () => {
    expect(isTerminalResizeRequest({ terminalId: 't1', cols: 80, rows: 24 })).toBe(true)
  })

  it('rejects cols < 1', () => {
    expect(isTerminalResizeRequest({ terminalId: 't1', cols: 0, rows: 24 })).toBe(false)
  })

  it('rejects rows < 1', () => {
    expect(isTerminalResizeRequest({ terminalId: 't1', cols: 80, rows: 0 })).toBe(false)
  })

  it('rejects missing terminalId', () => {
    expect(isTerminalResizeRequest({ cols: 80, rows: 24 })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isTerminalResizeRequest(null)).toBe(false)
    expect(isTerminalResizeRequest(undefined)).toBe(false)
  })
})

// ── TerminalKillRequest ──────────────────────────────────────

describe('isTerminalKillRequest', () => {
  it('accepts valid request', () => {
    expect(isTerminalKillRequest({ terminalId: 't1' })).toBe(true)
  })

  it('rejects empty terminalId', () => {
    expect(isTerminalKillRequest({ terminalId: '' })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isTerminalKillRequest(null)).toBe(false)
    expect(isTerminalKillRequest('t1')).toBe(false)
  })
})

// ── TerminalLayoutRequest ────────────────────────────────────

describe('isTerminalLayoutRequest', () => {
  it('accepts valid request', () => {
    expect(isTerminalLayoutRequest({ projectId: 'p1' })).toBe(true)
  })

  it('rejects empty projectId', () => {
    expect(isTerminalLayoutRequest({ projectId: '' })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isTerminalLayoutRequest(null)).toBe(false)
  })
})

// ── TerminalSetLayoutRequest ─────────────────────────────────

describe('isTerminalSetLayoutRequest', () => {
  it('accepts valid request with leaf layout', () => {
    expect(
      isTerminalSetLayoutRequest({
        projectId: 'p1',
        layout: { type: 'leaf', id: 'a', terminalId: 'b' },
      }),
    ).toBe(true)
  })

  it('accepts valid request with branch layout', () => {
    expect(
      isTerminalSetLayoutRequest({
        projectId: 'p1',
        layout: {
          type: 'branch',
          id: 'a',
          direction: 'horizontal',
          ratio: 0.5,
          children: [
            { type: 'leaf', id: 'b', terminalId: 'c' },
            { type: 'leaf', id: 'd', terminalId: 'e' },
          ],
        },
      }),
    ).toBe(true)
  })

  it('rejects empty projectId', () => {
    expect(
      isTerminalSetLayoutRequest({
        projectId: '',
        layout: { type: 'leaf', id: 'a', terminalId: 'b' },
      }),
    ).toBe(false)
  })

  it('rejects invalid layout', () => {
    expect(isTerminalSetLayoutRequest({ projectId: 'p1', layout: { type: 'unknown' } })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isTerminalSetLayoutRequest(null)).toBe(false)
    expect(isTerminalSetLayoutRequest(undefined)).toBe(false)
  })
})

// ── Payload validation for terminal channels ─────────────────

describe('terminal channel payload validation', () => {
  it('validates TERMINAL_CREATE', () => {
    expect(
      validatePayload(IPC_CHANNELS.TERMINAL_CREATE, {
        projectId: 'p1',
        terminalId: 't1',
        cwd: '/tmp',
      }),
    ).toBe(true)
    expect(validatePayload(IPC_CHANNELS.TERMINAL_CREATE, undefined)).toBe(false)
  })

  it('validates TERMINAL_WRITE', () => {
    expect(validatePayload(IPC_CHANNELS.TERMINAL_WRITE, { terminalId: 't1', data: 'ls' })).toBe(
      true,
    )
    expect(validatePayload(IPC_CHANNELS.TERMINAL_WRITE, undefined)).toBe(false)
  })

  it('validates TERMINAL_RESIZE', () => {
    expect(
      validatePayload(IPC_CHANNELS.TERMINAL_RESIZE, { terminalId: 't1', cols: 80, rows: 24 }),
    ).toBe(true)
    expect(validatePayload(IPC_CHANNELS.TERMINAL_RESIZE, undefined)).toBe(false)
  })

  it('validates TERMINAL_KILL', () => {
    expect(validatePayload(IPC_CHANNELS.TERMINAL_KILL, { terminalId: 't1' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.TERMINAL_KILL, undefined)).toBe(false)
  })

  it('validates TERMINAL_KILL_ALL', () => {
    expect(validatePayload(IPC_CHANNELS.TERMINAL_KILL_ALL, 'project-id')).toBe(true)
    expect(validatePayload(IPC_CHANNELS.TERMINAL_KILL_ALL, '')).toBe(false)
    expect(validatePayload(IPC_CHANNELS.TERMINAL_KILL_ALL, undefined)).toBe(false)
  })

  it('validates TERMINAL_GET_LAYOUT', () => {
    expect(validatePayload(IPC_CHANNELS.TERMINAL_GET_LAYOUT, { projectId: 'p1' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.TERMINAL_GET_LAYOUT, undefined)).toBe(false)
  })

  it('validates TERMINAL_SET_LAYOUT', () => {
    expect(
      validatePayload(IPC_CHANNELS.TERMINAL_SET_LAYOUT, {
        projectId: 'p1',
        layout: { type: 'leaf', id: 'a', terminalId: 'b' },
      }),
    ).toBe(true)
    expect(validatePayload(IPC_CHANNELS.TERMINAL_SET_LAYOUT, undefined)).toBe(false)
  })

  it('validates GIT_BRANCH', () => {
    expect(validatePayload(IPC_CHANNELS.GIT_BRANCH, { cwd: '/Users/test' })).toBe(true)
    expect(validatePayload(IPC_CHANNELS.GIT_BRANCH, { cwd: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.GIT_BRANCH, undefined)).toBe(false)
  })
})

// ── GitBranchRequest ────────────────────────────────────────

describe('isGitBranchRequest', () => {
  it('accepts valid request', () => {
    expect(isGitBranchRequest({ cwd: '/Users/test' })).toBe(true)
  })

  it('rejects empty cwd', () => {
    expect(isGitBranchRequest({ cwd: '' })).toBe(false)
  })

  it('rejects missing cwd', () => {
    expect(isGitBranchRequest({})).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isGitBranchRequest(null)).toBe(false)
    expect(isGitBranchRequest(undefined)).toBe(false)
    expect(isGitBranchRequest('string')).toBe(false)
  })
})
