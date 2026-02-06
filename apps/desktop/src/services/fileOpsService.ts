import { existsSync, realpathSync } from 'node:fs'
import {
  access,
  mkdir,
  readdir,
  readFile as fsReadFile,
  rename,
  stat,
  writeFile as fsWriteFile,
} from 'node:fs/promises'
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

/** Maximum number of entries in writeLocks before cleanup triggers */
const MAX_WRITE_LOCKS = 100

/** Sentinel resolved promise for detecting settled entries */
const SETTLED = Promise.resolve('__settled__')

/**
 * Remove settled (already-resolved) entries from the writeLocks map.
 * Uses Promise.race to detect if a stored promise has already settled:
 * if it wins the race against the sentinel, it was settled.
 */
async function cleanupSettledLocks(): Promise<void> {
  const entries = [...writeLocks.entries()]
  await Promise.all(
    entries.map(async ([key, promise]) => {
      const winner = await Promise.race([
        promise.then(() => 'done'),
        SETTLED,
      ])
      // If the stored promise won (returned 'done'), it's settled — safe to remove
      if (winner === 'done') {
        // Only delete if the map still holds the same promise (no new write queued)
        if (writeLocks.get(key) === promise) {
          writeLocks.delete(key)
        }
      }
    }),
  )
}

async function withLock<T>(key: string, fn: () => T | Promise<T>): Promise<T> {
  // Periodically clean up settled entries when the map grows too large
  if (writeLocks.size > MAX_WRITE_LOCKS) {
    await cleanupSettledLocks()
  }

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

// ── Async existence check ──────────────────────────────────────

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

// ── Path safety ────────────────────────────────────────────────

/**
 * Resolve a relative path inside a project root safely.
 * Throws on path traversal, absolute paths, or symlink escape.
 *
 * Note: The symlink escape check uses synchronous fs calls because
 * this function is also used in benchmarks and tests that expect
 * synchronous throws. The symlink check only hits 1-2 ancestor
 * directories so the blocking cost is negligible.
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

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const dir = dirname(filePath)
  const tmp = join(dir, `.fileops-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`)
  await fsWriteFile(tmp, contents, 'utf-8')
  await rename(tmp, filePath)
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

  return withLock(resolved, async () => {
    if (await exists(resolved)) {
      return fail('FILE_EXISTS', `File already exists: ${relPath}`)
    }

    const dir = dirname(resolved)
    if (!(await exists(dir))) {
      if (!mkdirp) {
        return fail('FILE_NOT_FOUND', `Directory does not exist: ${dirname(relPath)}`)
      }
      await mkdir(dir, { recursive: true })
    }

    await atomicWrite(resolved, contents)
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

  if (!(await exists(resolved))) {
    return fail('FILE_NOT_FOUND', `File not found: ${relPath}`)
  }

  const s = await stat(resolved)
  if (s.size > FILE_OPS_MAX_SIZE) {
    return fail('TOO_LARGE', `File size ${s.size} exceeds limit of ${FILE_OPS_MAX_SIZE} bytes`)
  }

  const contents = await fsReadFile(resolved, 'utf-8')
  return { contents, size: s.size }
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

  return withLock(resolved, async () => {
    if (mode === 'createOnly' && (await exists(resolved))) {
      return fail('FILE_EXISTS', `File already exists: ${relPath}`)
    }

    const dir = dirname(resolved)
    if (!(await exists(resolved)) && !(await exists(dir))) {
      return fail('FILE_NOT_FOUND', `Directory does not exist: ${dirname(relPath)}`)
    }

    await atomicWrite(resolved, contents)
    return ok()
  })
}

// ── Directory listing ──────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__'])

/**
 * List directory contents inside a project.
 *
 * @param projectRoot  Absolute path to the project directory
 * @param dirPath      Relative path within the project ('' for root)
 */
export async function listDir(
  projectRoot: string,
  dirPath: string,
): Promise<FileListResponse> {
  const resolved = dirPath === '' ? projectRoot : safeResolveProjectPath(projectRoot, dirPath)
  const entries = await readdir(resolved, { withFileTypes: true })

  const filtered = entries.filter((entry) => {
    if (entry.name.startsWith('.')) return false
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) return false
    return true
  })

  // Stat all files in parallel — directories get size 0
  const results = await Promise.all(
    filtered.map(async (entry): Promise<FileEntry | null> => {
      if (entry.isDirectory()) {
        return { name: entry.name, isDir: true, size: 0 }
      }
      try {
        const s = await stat(join(resolved, entry.name))
        return { name: entry.name, isDir: false, size: s.size }
      } catch {
        return null
      }
    }),
  )

  const result = results.filter((r): r is FileEntry => r !== null)

  // Sort: directories first, then files, alphabetically within each group
  result.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return result
}
