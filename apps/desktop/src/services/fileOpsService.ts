import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, join, normalize, relative } from 'node:path'
import { FILE_OPS_MAX_SIZE } from '@shared/types'
import type {
  FileEntry,
  FileListResponse,
  FileOpsResult,
  FileReadResponse,
  FileOpsError,
  FileWriteMode,
} from '@shared/types'

// ── Per-file write mutex ───────────────────────────────────────
//
// Simple promise-chain lock keyed by absolute path.
// Each write to the same file queues behind the previous one,
// preventing concurrent atomic-write races.

const writeLocks = new Map<string, Promise<unknown>>()

async function withLock<T>(key: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = writeLocks.get(key) ?? Promise.resolve()
  const next = prev.then(fn, fn)
  // Store a void-settling copy so rejections don't propagate to the next caller
  writeLocks.set(
    key,
    next.then(
      () => {},
      () => {},
    ),
  )
  // Clean up when the queue fully drains
  next.finally(() => {
    if (writeLocks.get(key) === next) writeLocks.delete(key)
  })
  return next
}

// ── Error helpers ──────────────────────────────────────────────

function fail(code: FileOpsError['code'], message: string): FileOpsResult {
  return { ok: false, error: { code, message } }
}

function ok(): FileOpsResult {
  return { ok: true }
}

// ── Path safety ────────────────────────────────────────────────

/**
 * Resolve a relative path inside a project root safely.
 * Throws on path traversal, absolute paths, or symlink escape.
 */
export function safeResolveProjectPath(projectRoot: string, relPath: string): string {
  // Reject absolute paths — only relative paths inside the project are allowed
  if (isAbsolute(relPath)) {
    throw Object.assign(new Error('Absolute paths are not allowed'), {
      fileOpsCode: 'PATH_TRAVERSAL' as const,
    })
  }

  // Reject null bytes (classic path-injection vector)
  if (relPath.includes('\0')) {
    throw Object.assign(new Error('Null bytes in path are not allowed'), {
      fileOpsCode: 'PATH_TRAVERSAL' as const,
    })
  }

  const resolved = normalize(join(projectRoot, relPath))

  // After normalization the resolved path must stay within the project root
  const rel = relative(projectRoot, resolved)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw Object.assign(new Error('Path escapes project root'), {
      fileOpsCode: 'PATH_TRAVERSAL' as const,
    })
  }

  // Symlink escape check: walk up from the resolved path to find the
  // deepest ancestor that actually exists on disk, then verify its
  // real (symlink-resolved) location is still inside the project root.
  let check = resolved
  while (!existsSync(check)) {
    const parent = dirname(check)
    if (parent === check) break // reached filesystem root
    check = parent
  }
  if (existsSync(check)) {
    const real = realpathSync(check)
    const realRoot = realpathSync(projectRoot)
    if (!real.startsWith(realRoot)) {
      throw Object.assign(new Error('Symlink escapes project root'), {
        fileOpsCode: 'PATH_TRAVERSAL' as const,
      })
    }
  }

  return resolved
}

// ── Atomic write helper ────────────────────────────────────────
//
// Writes to a temp file in the same directory, then renames over
// the target. Since rename is atomic on the same filesystem, this
// prevents partial/corrupt files on crash.

function atomicWrite(filePath: string, contents: string): void {
  const dir = dirname(filePath)
  const tmp = join(dir, `.fileops-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`)
  writeFileSync(tmp, contents, 'utf-8')
  renameSync(tmp, filePath)
}

// ── Shared path-resolution wrapper ─────────────────────────────

function resolveSafe(projectRoot: string, relPath: string): string | FileOpsResult {
  try {
    return safeResolveProjectPath(projectRoot, relPath)
  } catch (err: unknown) {
    const e = err as { fileOpsCode?: string; message?: string }
    return fail(
      (e.fileOpsCode as FileOpsError['code']) ?? 'PATH_TRAVERSAL',
      e.message ?? 'Invalid path',
    )
  }
}

/** Type guard: true when resolveSafe returned an error result instead of a string. */
function isFailure(v: string | FileOpsResult): v is FileOpsResult {
  return typeof v !== 'string'
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Create a new file inside a project.
 *
 * @param projectRoot  Absolute path to the project directory
 * @param relPath      Relative path within the project (e.g. "src/hello.ts")
 * @param contents     Initial file contents (default: empty string)
 * @param mkdirp       Create parent directories if missing (default: false)
 */
export async function createFile(
  projectRoot: string,
  relPath: string,
  contents: string = '',
  mkdirp: boolean = false,
): Promise<FileOpsResult> {
  const resolved = resolveSafe(projectRoot, relPath)
  if (isFailure(resolved)) return resolved

  const bytes = Buffer.byteLength(contents, 'utf-8')
  if (bytes > FILE_OPS_MAX_SIZE) {
    return fail('TOO_LARGE', `Content size ${bytes} exceeds limit of ${FILE_OPS_MAX_SIZE} bytes`)
  }

  return withLock(resolved, () => {
    if (existsSync(resolved)) {
      return fail('FILE_EXISTS', `File already exists: ${relPath}`)
    }

    const dir = dirname(resolved)
    if (!existsSync(dir)) {
      if (!mkdirp) {
        return fail('FILE_NOT_FOUND', `Directory does not exist: ${dirname(relPath)}`)
      }
      mkdirSync(dir, { recursive: true })
    }

    atomicWrite(resolved, contents)
    return ok()
  })
}

/**
 * Read a file from within a project.
 *
 * @param projectRoot  Absolute path to the project directory
 * @param relPath      Relative path within the project
 */
export async function readFile(
  projectRoot: string,
  relPath: string,
): Promise<FileReadResponse | FileOpsResult> {
  const resolved = resolveSafe(projectRoot, relPath)
  if (isFailure(resolved)) return resolved

  if (!existsSync(resolved)) {
    return fail('FILE_NOT_FOUND', `File not found: ${relPath}`)
  }

  const stat = statSync(resolved)
  if (stat.size > FILE_OPS_MAX_SIZE) {
    return fail('TOO_LARGE', `File size ${stat.size} exceeds limit of ${FILE_OPS_MAX_SIZE} bytes`)
  }

  const contents = readFileSync(resolved, 'utf-8')
  return { contents, size: stat.size }
}

/**
 * Write (or overwrite) a file inside a project.
 *
 * @param projectRoot  Absolute path to the project directory
 * @param relPath      Relative path within the project
 * @param contents     New file contents
 * @param mode         'overwrite' replaces existing; 'createOnly' fails if file exists
 */
export async function writeFile(
  projectRoot: string,
  relPath: string,
  contents: string,
  mode: FileWriteMode,
): Promise<FileOpsResult> {
  const resolved = resolveSafe(projectRoot, relPath)
  if (isFailure(resolved)) return resolved

  const bytes = Buffer.byteLength(contents, 'utf-8')
  if (bytes > FILE_OPS_MAX_SIZE) {
    return fail('TOO_LARGE', `Content size ${bytes} exceeds limit of ${FILE_OPS_MAX_SIZE} bytes`)
  }

  return withLock(resolved, () => {
    if (mode === 'createOnly' && existsSync(resolved)) {
      return fail('FILE_EXISTS', `File already exists: ${relPath}`)
    }

    const dir = dirname(resolved)
    if (!existsSync(resolved) && !existsSync(dir)) {
      return fail('FILE_NOT_FOUND', `Directory does not exist: ${dirname(relPath)}`)
    }

    atomicWrite(resolved, contents)
    return ok()
  })
}

// ── Directory listing ──────────────────────────────────────────

/**
 * List directory contents inside a project.
 *
 * @param projectRoot  Absolute path to the project directory
 * @param dirPath      Relative path within the project ('' for root)
 */
export function listDir(projectRoot: string, dirPath: string): FileListResponse {
  const resolved = dirPath === '' ? projectRoot : safeResolveProjectPath(projectRoot, dirPath)
  const entries = readdirSync(resolved, { withFileTypes: true })

  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__'])

  const result: FileEntry[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory() && SKIP.has(entry.name)) continue
    const fullPath = join(resolved, entry.name)
    let size = 0
    try {
      size = entry.isDirectory() ? 0 : statSync(fullPath).size
    } catch {
      // skip entries we can't stat
      continue
    }
    result.push({ name: entry.name, isDir: entry.isDirectory(), size })
  }

  // Sort: directories first, then files, alphabetically within each group
  result.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return result
}
