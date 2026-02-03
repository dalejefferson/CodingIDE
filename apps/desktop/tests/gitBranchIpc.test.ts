import { describe, it, expect } from 'vitest'
import {
  isGitBranchRequest,
  IPC_CHANNELS,
  ALLOWED_CHANNELS,
  validatePayload,
} from '../src/shared/ipcContracts'

describe('isGitBranchRequest', () => {
  it('accepts valid request', () => {
    expect(isGitBranchRequest({ cwd: '/path/to/dir' })).toBe(true)
  })

  it('rejects empty cwd', () => {
    expect(isGitBranchRequest({ cwd: '' })).toBe(false)
  })

  it('rejects missing cwd', () => {
    expect(isGitBranchRequest({})).toBe(false)
  })

  it('rejects null', () => {
    expect(isGitBranchRequest(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isGitBranchRequest(undefined)).toBe(false)
  })

  it('rejects string', () => {
    expect(isGitBranchRequest('string')).toBe(false)
  })

  it('rejects number', () => {
    expect(isGitBranchRequest(42)).toBe(false)
  })
})

describe('GIT_BRANCH channel registration', () => {
  it('exists in IPC_CHANNELS', () => {
    expect(IPC_CHANNELS.GIT_BRANCH).toBe('ipc:git-branch')
  })

  it('is in ALLOWED_CHANNELS', () => {
    expect(ALLOWED_CHANNELS.has(IPC_CHANNELS.GIT_BRANCH)).toBe(true)
  })

  it('validatePayload accepts valid GitBranchRequest', () => {
    expect(validatePayload(IPC_CHANNELS.GIT_BRANCH, { cwd: '/Users/test' })).toBe(true)
  })

  it('validatePayload rejects invalid GitBranchRequest', () => {
    expect(validatePayload(IPC_CHANNELS.GIT_BRANCH, { cwd: '' })).toBe(false)
    expect(validatePayload(IPC_CHANNELS.GIT_BRANCH, undefined)).toBe(false)
    expect(validatePayload(IPC_CHANNELS.GIT_BRANCH, null)).toBe(false)
  })
})
