import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, symlinkSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  safeResolveProjectPath,
  createFile,
  readFile,
  writeFile,
  listDir,
} from '@services/fileOpsService'
import { FILE_OPS_MAX_SIZE } from '@shared/types'
import {
  isFileCreateRequest,
  isFileReadRequest,
  isFileWriteRequest,
  isFileListRequest,
} from '@shared/ipcContracts'

let root: string

beforeEach(() => {
  root = join(tmpdir(), `fileops-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

// ── safeResolveProjectPath ──────────────────────────────────

describe('safeResolveProjectPath', () => {
  it('resolves a simple relative path', () => {
    const result = safeResolveProjectPath(root, 'src/hello.ts')
    expect(result).toBe(join(root, 'src/hello.ts'))
  })

  it('rejects absolute paths', () => {
    expect(() => safeResolveProjectPath(root, '/etc/passwd')).toThrow()
  })

  it('rejects ../ traversal', () => {
    expect(() => safeResolveProjectPath(root, '../../../etc/passwd')).toThrow()
  })

  it('rejects sneaky ../ in middle of path', () => {
    expect(() => safeResolveProjectPath(root, 'src/../../etc/passwd')).toThrow()
  })

  it('rejects null bytes', () => {
    expect(() => safeResolveProjectPath(root, 'src/\0evil.ts')).toThrow()
  })

  it('allows nested relative paths', () => {
    const result = safeResolveProjectPath(root, 'src/utils/deep/file.ts')
    expect(result).toBe(join(root, 'src/utils/deep/file.ts'))
  })

  it('normalizes redundant slashes', () => {
    const result = safeResolveProjectPath(root, 'src///utils//file.ts')
    expect(result).toBe(join(root, 'src/utils/file.ts'))
  })

  it('rejects symlink escape', () => {
    // Create a symlink that points outside the project root
    const outsideDir = join(tmpdir(), `outside-${Date.now()}`)
    mkdirSync(outsideDir, { recursive: true })
    const linkPath = join(root, 'escape-link')
    symlinkSync(outsideDir, linkPath)
    expect(() => safeResolveProjectPath(root, 'escape-link/file.txt')).toThrow()
    rmSync(outsideDir, { recursive: true, force: true })
  })
})

// ── createFile ──────────────────────────────────────────────

describe('createFile', () => {
  it('creates a file in an existing directory', async () => {
    const result = await createFile(root, 'hello.txt', 'world')
    expect(result.ok).toBe(true)
    expect(readFileSync(join(root, 'hello.txt'), 'utf-8')).toBe('world')
  })

  it('creates a file with empty contents by default', async () => {
    const result = await createFile(root, 'empty.txt')
    expect(result.ok).toBe(true)
    expect(readFileSync(join(root, 'empty.txt'), 'utf-8')).toBe('')
  })

  it('fails if file already exists', async () => {
    writeFileSync(join(root, 'exists.txt'), 'old')
    const result = await createFile(root, 'exists.txt', 'new')
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('FILE_EXISTS')
  })

  it('fails if directory does not exist and mkdirp is false', async () => {
    const result = await createFile(root, 'deep/nested/file.txt', 'data', false)
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('FILE_NOT_FOUND')
  })

  it('creates directories when mkdirp is true', async () => {
    const result = await createFile(root, 'deep/nested/file.txt', 'data', true)
    expect(result.ok).toBe(true)
    expect(readFileSync(join(root, 'deep/nested/file.txt'), 'utf-8')).toBe('data')
  })

  it('rejects path traversal', async () => {
    const result = await createFile(root, '../escape.txt', 'evil')
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('PATH_TRAVERSAL')
  })

  it('rejects content exceeding size limit', async () => {
    const bigContent = 'x'.repeat(FILE_OPS_MAX_SIZE + 1)
    const result = await createFile(root, 'big.txt', bigContent)
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('TOO_LARGE')
  })
})

// ── readFile ────────────────────────────────────────────────

describe('readFile', () => {
  it('reads an existing file', async () => {
    writeFileSync(join(root, 'data.txt'), 'hello world')
    const result = await readFile(root, 'data.txt')
    expect('contents' in result).toBe(true)
    if ('contents' in result) {
      expect(result.contents).toBe('hello world')
      expect(result.size).toBeGreaterThan(0)
    }
  })

  it('fails for non-existent file', async () => {
    const result = await readFile(root, 'missing.txt')
    expect('ok' in result && !result.ok).toBe(true)
  })

  it('rejects path traversal', async () => {
    const result = await readFile(root, '../../etc/passwd')
    expect('ok' in result && !result.ok).toBe(true)
  })
})

// ── writeFile ───────────────────────────────────────────────

describe('writeFile', () => {
  it('overwrites an existing file', async () => {
    writeFileSync(join(root, 'target.txt'), 'old')
    const result = await writeFile(root, 'target.txt', 'new', 'overwrite')
    expect(result.ok).toBe(true)
    expect(readFileSync(join(root, 'target.txt'), 'utf-8')).toBe('new')
  })

  it('fails in createOnly mode if file exists', async () => {
    writeFileSync(join(root, 'exists.txt'), 'old')
    const result = await writeFile(root, 'exists.txt', 'new', 'createOnly')
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('FILE_EXISTS')
  })

  it('rejects path traversal', async () => {
    const result = await writeFile(root, '../evil.txt', 'data', 'overwrite')
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('PATH_TRAVERSAL')
  })

  it('rejects content exceeding size limit', async () => {
    writeFileSync(join(root, 'file.txt'), '')
    const bigContent = 'x'.repeat(FILE_OPS_MAX_SIZE + 1)
    const result = await writeFile(root, 'file.txt', bigContent, 'overwrite')
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('TOO_LARGE')
  })

  it('fails if directory does not exist', async () => {
    const result = await writeFile(root, 'missing-dir/file.txt', 'data', 'overwrite')
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('FILE_NOT_FOUND')
  })
})

// ── Validator tests (from ipcContracts) ─────────────────────

describe('fileOps validators', () => {
  describe('isFileCreateRequest', () => {
    it('accepts valid request with all fields', () => {
      expect(
        isFileCreateRequest({
          projectId: 'abc',
          relPath: 'src/file.ts',
          contents: 'data',
          mkdirp: true,
        }),
      ).toBe(true)
    })

    it('accepts request with only required fields', () => {
      expect(isFileCreateRequest({ projectId: 'abc', relPath: 'file.txt' })).toBe(true)
    })

    it('rejects missing projectId', () => {
      expect(isFileCreateRequest({ relPath: 'file.txt' })).toBe(false)
    })

    it('rejects empty projectId', () => {
      expect(isFileCreateRequest({ projectId: '', relPath: 'file.txt' })).toBe(false)
    })

    it('rejects missing relPath', () => {
      expect(isFileCreateRequest({ projectId: 'abc' })).toBe(false)
    })

    it('rejects empty relPath', () => {
      expect(isFileCreateRequest({ projectId: 'abc', relPath: '' })).toBe(false)
    })

    it('rejects non-string contents', () => {
      expect(isFileCreateRequest({ projectId: 'abc', relPath: 'f.ts', contents: 123 })).toBe(false)
    })

    it('rejects non-boolean mkdirp', () => {
      expect(isFileCreateRequest({ projectId: 'abc', relPath: 'f.ts', mkdirp: 'yes' })).toBe(false)
    })

    it('rejects null', () => {
      expect(isFileCreateRequest(null)).toBe(false)
    })

    it('rejects primitives', () => {
      expect(isFileCreateRequest('string')).toBe(false)
      expect(isFileCreateRequest(42)).toBe(false)
      expect(isFileCreateRequest(undefined)).toBe(false)
    })
  })

  describe('isFileReadRequest', () => {
    it('accepts valid request', () => {
      expect(isFileReadRequest({ projectId: 'abc', relPath: 'src/file.ts' })).toBe(true)
    })

    it('rejects missing fields', () => {
      expect(isFileReadRequest({ projectId: 'abc' })).toBe(false)
      expect(isFileReadRequest({ relPath: 'f.ts' })).toBe(false)
    })

    it('rejects empty strings', () => {
      expect(isFileReadRequest({ projectId: '', relPath: 'f.ts' })).toBe(false)
      expect(isFileReadRequest({ projectId: 'abc', relPath: '' })).toBe(false)
    })
  })

  describe('isFileWriteRequest', () => {
    it('accepts valid overwrite request', () => {
      expect(
        isFileWriteRequest({
          projectId: 'abc',
          relPath: 'f.ts',
          contents: 'data',
          mode: 'overwrite',
        }),
      ).toBe(true)
    })

    it('accepts valid createOnly request', () => {
      expect(
        isFileWriteRequest({
          projectId: 'abc',
          relPath: 'f.ts',
          contents: 'data',
          mode: 'createOnly',
        }),
      ).toBe(true)
    })

    it('rejects invalid mode', () => {
      expect(
        isFileWriteRequest({
          projectId: 'abc',
          relPath: 'f.ts',
          contents: 'data',
          mode: 'append',
        }),
      ).toBe(false)
    })

    it('rejects missing contents', () => {
      expect(isFileWriteRequest({ projectId: 'abc', relPath: 'f.ts', mode: 'overwrite' })).toBe(
        false,
      )
    })

    it('rejects non-string contents', () => {
      expect(
        isFileWriteRequest({
          projectId: 'abc',
          relPath: 'f.ts',
          contents: 42,
          mode: 'overwrite',
        }),
      ).toBe(false)
    })
  })

  describe('isFileListRequest', () => {
    it('accepts valid request with non-empty dirPath', () => {
      expect(isFileListRequest({ projectId: 'abc', dirPath: 'src' })).toBe(true)
    })

    it('accepts valid request with empty dirPath (root)', () => {
      expect(isFileListRequest({ projectId: 'abc', dirPath: '' })).toBe(true)
    })

    it('rejects missing projectId', () => {
      expect(isFileListRequest({ dirPath: 'src' })).toBe(false)
    })

    it('rejects empty projectId', () => {
      expect(isFileListRequest({ projectId: '', dirPath: 'src' })).toBe(false)
    })

    it('rejects missing dirPath', () => {
      expect(isFileListRequest({ projectId: 'abc' })).toBe(false)
    })

    it('rejects non-string dirPath', () => {
      expect(isFileListRequest({ projectId: 'abc', dirPath: 123 })).toBe(false)
    })

    it('rejects null', () => {
      expect(isFileListRequest(null)).toBe(false)
    })

    it('rejects primitives', () => {
      expect(isFileListRequest('string')).toBe(false)
      expect(isFileListRequest(42)).toBe(false)
      expect(isFileListRequest(undefined)).toBe(false)
    })
  })
})

// ── listDir ─────────────────────────────────────────────────

describe('listDir', () => {
  it('lists files and directories correctly', async () => {
    writeFileSync(join(root, 'file.txt'), 'hello')
    mkdirSync(join(root, 'subdir'))
    const result = await listDir(root, '')
    expect(result.length).toBe(2)
    expect(result[0]).toEqual({ name: 'subdir', isDir: true, size: 0 })
    expect(result[1]).toEqual({ name: 'file.txt', isDir: false, size: 5 })
  })

  it('returns empty array for empty directory', async () => {
    const result = await listDir(root, '')
    expect(result).toEqual([])
  })

  it('sorts directories before files', async () => {
    writeFileSync(join(root, 'aaa.txt'), 'a')
    mkdirSync(join(root, 'zzz'))
    const result = await listDir(root, '')
    expect(result[0]!.name).toBe('zzz')
    expect(result[0]!.isDir).toBe(true)
    expect(result[1]!.name).toBe('aaa.txt')
    expect(result[1]!.isDir).toBe(false)
  })

  it('skips hidden files (dotfiles)', async () => {
    writeFileSync(join(root, '.hidden'), 'secret')
    writeFileSync(join(root, 'visible.txt'), 'hello')
    const result = await listDir(root, '')
    expect(result.length).toBe(1)
    expect(result[0]!.name).toBe('visible.txt')
  })

  it('skips node_modules directory', async () => {
    mkdirSync(join(root, 'node_modules'))
    mkdirSync(join(root, 'src'))
    const result = await listDir(root, '')
    expect(result.length).toBe(1)
    expect(result[0]!.name).toBe('src')
  })

  it('lists a subdirectory via dirPath', async () => {
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src', 'index.ts'), 'export {}')
    const result = await listDir(root, 'src')
    expect(result.length).toBe(1)
    expect(result[0]!.name).toBe('index.ts')
  })

  it('rejects path traversal', async () => {
    await expect(listDir(root, '../../../etc')).rejects.toThrow()
  })
})
