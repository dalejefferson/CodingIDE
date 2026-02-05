import { describe, it, expect } from 'vitest'
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
} from '../src/shared/expoValidators'

// ── isCreateMobileAppRequest ────────────────────────────────

describe('isCreateMobileAppRequest', () => {
  it('accepts valid blank template', () => {
    expect(isCreateMobileAppRequest({ name: 'my-app', template: 'blank', parentDir: '/tmp' })).toBe(
      true,
    )
  })

  it('accepts valid tabs template', () => {
    expect(isCreateMobileAppRequest({ name: 'test', template: 'tabs', parentDir: '/home' })).toBe(
      true,
    )
  })

  it('accepts valid drawer template', () => {
    expect(
      isCreateMobileAppRequest({ name: 'app', template: 'drawer', parentDir: '/Users/me' }),
    ).toBe(true)
  })

  it('rejects empty name', () => {
    expect(isCreateMobileAppRequest({ name: '', template: 'blank', parentDir: '/tmp' })).toBe(false)
  })

  it('rejects missing name', () => {
    expect(isCreateMobileAppRequest({ template: 'blank', parentDir: '/tmp' })).toBe(false)
  })

  it('rejects invalid template', () => {
    expect(isCreateMobileAppRequest({ name: 'app', template: 'invalid', parentDir: '/tmp' })).toBe(
      false,
    )
  })

  it('rejects missing template', () => {
    expect(isCreateMobileAppRequest({ name: 'app', parentDir: '/tmp' })).toBe(false)
  })

  it('rejects empty parentDir', () => {
    expect(isCreateMobileAppRequest({ name: 'app', template: 'blank', parentDir: '' })).toBe(false)
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

  it('accepts valid request with optional PRD fields', () => {
    expect(
      isCreateMobileAppRequest({
        name: 'my-app',
        template: 'blank',
        parentDir: '/tmp',
        prdContent: '# PRD',
        paletteId: 'ocean',
        imagePaths: ['/img/a.png', '/img/b.png'],
      }),
    ).toBe(true)
  })

  it('accepts valid request with partial PRD fields', () => {
    expect(
      isCreateMobileAppRequest({
        name: 'my-app',
        template: 'blank',
        parentDir: '/tmp',
        prdContent: '# PRD',
      }),
    ).toBe(true)
  })

  it('rejects non-string prdContent', () => {
    expect(
      isCreateMobileAppRequest({
        name: 'app',
        template: 'blank',
        parentDir: '/tmp',
        prdContent: 42,
      }),
    ).toBe(false)
  })

  it('rejects non-string paletteId', () => {
    expect(
      isCreateMobileAppRequest({
        name: 'app',
        template: 'blank',
        parentDir: '/tmp',
        paletteId: 123,
      }),
    ).toBe(false)
  })

  it('rejects non-array imagePaths', () => {
    expect(
      isCreateMobileAppRequest({
        name: 'app',
        template: 'blank',
        parentDir: '/tmp',
        imagePaths: 'not-array',
      }),
    ).toBe(false)
  })

  it('rejects imagePaths with non-string entries', () => {
    expect(
      isCreateMobileAppRequest({
        name: 'app',
        template: 'blank',
        parentDir: '/tmp',
        imagePaths: ['/valid.png', 42],
      }),
    ).toBe(false)
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

// ── isGenerateMobilePRDRequest ─────────────────────────────

describe('isGenerateMobilePRDRequest', () => {
  it('accepts valid request', () => {
    expect(isGenerateMobilePRDRequest({ appDescription: 'A todo app', template: 'blank' })).toBe(
      true,
    )
  })

  it('accepts valid request with paletteId', () => {
    expect(
      isGenerateMobilePRDRequest({
        appDescription: 'A todo app',
        template: 'tabs',
        paletteId: 'ocean',
      }),
    ).toBe(true)
  })

  it('rejects empty appDescription', () => {
    expect(isGenerateMobilePRDRequest({ appDescription: '', template: 'blank' })).toBe(false)
  })

  it('rejects missing appDescription', () => {
    expect(isGenerateMobilePRDRequest({ template: 'blank' })).toBe(false)
  })

  it('rejects invalid template', () => {
    expect(isGenerateMobilePRDRequest({ appDescription: 'todo', template: 'invalid' })).toBe(false)
  })

  it('rejects missing template', () => {
    expect(isGenerateMobilePRDRequest({ appDescription: 'todo' })).toBe(false)
  })

  it('rejects non-string paletteId', () => {
    expect(
      isGenerateMobilePRDRequest({ appDescription: 'todo', template: 'blank', paletteId: 123 }),
    ).toBe(false)
  })

  it('rejects null', () => {
    expect(isGenerateMobilePRDRequest(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isGenerateMobilePRDRequest('string')).toBe(false)
  })
})

// ── isSavePRDRequest ───────────────────────────────────────

describe('isSavePRDRequest', () => {
  it('accepts valid request with paletteId', () => {
    expect(
      isSavePRDRequest({ appPath: '/path/to/app', prdContent: '# PRD', paletteId: 'ocean' }),
    ).toBe(true)
  })

  it('accepts valid request with null paletteId', () => {
    expect(
      isSavePRDRequest({ appPath: '/path/to/app', prdContent: '# PRD', paletteId: null }),
    ).toBe(true)
  })

  it('rejects empty appPath', () => {
    expect(isSavePRDRequest({ appPath: '', prdContent: '# PRD', paletteId: null })).toBe(false)
  })

  it('rejects empty prdContent', () => {
    expect(isSavePRDRequest({ appPath: '/path', prdContent: '', paletteId: null })).toBe(false)
  })

  it('rejects non-string/null paletteId', () => {
    expect(isSavePRDRequest({ appPath: '/path', prdContent: '# PRD', paletteId: 42 })).toBe(false)
  })

  it('rejects null', () => {
    expect(isSavePRDRequest(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isSavePRDRequest('string')).toBe(false)
  })
})

// ── isCopyPRDImagesRequest ─────────────────────────────────

describe('isCopyPRDImagesRequest', () => {
  it('accepts valid request', () => {
    expect(isCopyPRDImagesRequest({ appPath: '/path/to/app', imagePaths: ['/img/a.png'] })).toBe(
      true,
    )
  })

  it('accepts valid request with multiple images', () => {
    expect(
      isCopyPRDImagesRequest({
        appPath: '/path/to/app',
        imagePaths: ['/img/a.png', '/img/b.jpg'],
      }),
    ).toBe(true)
  })

  it('rejects empty appPath', () => {
    expect(isCopyPRDImagesRequest({ appPath: '', imagePaths: ['/img/a.png'] })).toBe(false)
  })

  it('rejects non-array imagePaths', () => {
    expect(isCopyPRDImagesRequest({ appPath: '/path', imagePaths: 'not-array' })).toBe(false)
  })

  it('rejects imagePaths with non-string entries', () => {
    expect(isCopyPRDImagesRequest({ appPath: '/path', imagePaths: [42] })).toBe(false)
  })

  it('rejects imagePaths with empty string entries', () => {
    expect(isCopyPRDImagesRequest({ appPath: '/path', imagePaths: [''] })).toBe(false)
  })

  it('rejects null', () => {
    expect(isCopyPRDImagesRequest(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isCopyPRDImagesRequest(42)).toBe(false)
  })
})
