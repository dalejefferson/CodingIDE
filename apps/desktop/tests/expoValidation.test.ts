import { describe, it, expect } from 'vitest'
import {
  isCreateMobileAppRequest,
  isAddMobileAppRequest,
  isStartExpoRequest,
  isStopExpoRequest,
  isExpoStatusRequest,
  isOpenMobileAppAsProjectRequest,
} from '../src/shared/expoValidators'

// ── isCreateMobileAppRequest ────────────────────────────────

describe('isCreateMobileAppRequest', () => {
  it('accepts valid blank template', () => {
    expect(
      isCreateMobileAppRequest({ name: 'my-app', template: 'blank', parentDir: '/tmp' }),
    ).toBe(true)
  })

  it('accepts valid tabs template', () => {
    expect(
      isCreateMobileAppRequest({ name: 'test', template: 'tabs', parentDir: '/home' }),
    ).toBe(true)
  })

  it('accepts valid drawer template', () => {
    expect(
      isCreateMobileAppRequest({ name: 'app', template: 'drawer', parentDir: '/Users/me' }),
    ).toBe(true)
  })

  it('rejects empty name', () => {
    expect(isCreateMobileAppRequest({ name: '', template: 'blank', parentDir: '/tmp' })).toBe(
      false,
    )
  })

  it('rejects missing name', () => {
    expect(isCreateMobileAppRequest({ template: 'blank', parentDir: '/tmp' })).toBe(false)
  })

  it('rejects invalid template', () => {
    expect(
      isCreateMobileAppRequest({ name: 'app', template: 'invalid', parentDir: '/tmp' }),
    ).toBe(false)
  })

  it('rejects missing template', () => {
    expect(isCreateMobileAppRequest({ name: 'app', parentDir: '/tmp' })).toBe(false)
  })

  it('rejects empty parentDir', () => {
    expect(isCreateMobileAppRequest({ name: 'app', template: 'blank', parentDir: '' })).toBe(
      false,
    )
  })

  it('rejects missing parentDir', () => {
    expect(isCreateMobileAppRequest({ name: 'app', template: 'blank' })).toBe(false)
  })

  it('rejects null', () => {
    expect(isCreateMobileAppRequest(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isCreateMobileAppRequest(undefined)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isCreateMobileAppRequest('string')).toBe(false)
    expect(isCreateMobileAppRequest(42)).toBe(false)
  })
})

// ── isAddMobileAppRequest ───────────────────────────────────

describe('isAddMobileAppRequest', () => {
  it('accepts valid path', () => {
    expect(isAddMobileAppRequest({ path: '/Users/me/my-app' })).toBe(true)
  })

  it('rejects empty path', () => {
    expect(isAddMobileAppRequest({ path: '' })).toBe(false)
  })

  it('rejects missing path', () => {
    expect(isAddMobileAppRequest({})).toBe(false)
  })

  it('rejects null', () => {
    expect(isAddMobileAppRequest(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isAddMobileAppRequest('string')).toBe(false)
  })
})

// ── isStartExpoRequest ──────────────────────────────────────

describe('isStartExpoRequest', () => {
  it('accepts valid appId', () => {
    expect(isStartExpoRequest({ appId: 'abc-123' })).toBe(true)
  })

  it('rejects empty appId', () => {
    expect(isStartExpoRequest({ appId: '' })).toBe(false)
  })

  it('rejects missing appId', () => {
    expect(isStartExpoRequest({})).toBe(false)
  })

  it('rejects null', () => {
    expect(isStartExpoRequest(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isStartExpoRequest(42)).toBe(false)
  })
})

// ── isStopExpoRequest ───────────────────────────────────────

describe('isStopExpoRequest', () => {
  it('accepts valid appId', () => {
    expect(isStopExpoRequest({ appId: 'abc-123' })).toBe(true)
  })

  it('rejects empty appId', () => {
    expect(isStopExpoRequest({ appId: '' })).toBe(false)
  })

  it('rejects missing appId', () => {
    expect(isStopExpoRequest({})).toBe(false)
  })

  it('rejects null', () => {
    expect(isStopExpoRequest(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isStopExpoRequest('string')).toBe(false)
  })
})

// ── isExpoStatusRequest ─────────────────────────────────────

describe('isExpoStatusRequest', () => {
  it('accepts valid appId', () => {
    expect(isExpoStatusRequest({ appId: 'abc-123' })).toBe(true)
  })

  it('rejects empty appId', () => {
    expect(isExpoStatusRequest({ appId: '' })).toBe(false)
  })

  it('rejects missing appId', () => {
    expect(isExpoStatusRequest({})).toBe(false)
  })

  it('rejects null', () => {
    expect(isExpoStatusRequest(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isExpoStatusRequest(42)).toBe(false)
  })
})

// ── isOpenMobileAppAsProjectRequest ─────────────────────────

describe('isOpenMobileAppAsProjectRequest', () => {
  it('accepts valid appId', () => {
    expect(isOpenMobileAppAsProjectRequest({ appId: 'abc-123' })).toBe(true)
  })

  it('rejects empty appId', () => {
    expect(isOpenMobileAppAsProjectRequest({ appId: '' })).toBe(false)
  })

  it('rejects missing appId', () => {
    expect(isOpenMobileAppAsProjectRequest({})).toBe(false)
  })

  it('rejects null', () => {
    expect(isOpenMobileAppAsProjectRequest(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isOpenMobileAppAsProjectRequest('string')).toBe(false)
  })
})
