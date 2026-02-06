/**
 * Git Service — reads git metadata safely via execFile (no shell).
 */

import { execFile } from 'node:child_process'

/** TTL cache entry for git branch results */
interface BranchCacheEntry {
  branch: string | null
  expiresAt: number
}

const branchCache = new Map<string, BranchCacheEntry>()

/** Cache TTL in milliseconds — branch changes are rare, 10s is safe */
const CACHE_TTL_MS = 10_000

/** Maximum number of entries in the branch cache before eviction triggers */
const MAX_CACHE_SIZE = 50

/**
 * Evict expired entries from the branch cache.
 * If still over MAX_CACHE_SIZE after expiry eviction,
 * delete the oldest entries by expiresAt until within limit.
 */
function evictBranchCache(): void {
  const now = Date.now()

  // First pass: remove expired entries
  for (const [key, entry] of branchCache) {
    if (now >= entry.expiresAt) {
      branchCache.delete(key)
    }
  }

  // Second pass: if still over limit, remove oldest by expiresAt
  if (branchCache.size > MAX_CACHE_SIZE) {
    const sorted = [...branchCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
    const toRemove = sorted.length - MAX_CACHE_SIZE
    for (let i = 0; i < toRemove; i++) {
      branchCache.delete(sorted[i]![0])
    }
  }
}

/**
 * Get the current git branch for a directory.
 * Returns null if not a git repo or on error.
 * Results are cached for 10 seconds per directory.
 */
export function getGitBranch(cwd: string): Promise<string | null> {
  // Evict stale entries if cache has grown beyond limit
  if (branchCache.size > MAX_CACHE_SIZE) {
    evictBranchCache()
  }

  const cached = branchCache.get(cwd)
  if (cached && Date.now() < cached.expiresAt) {
    return Promise.resolve(cached.branch)
  }

  return new Promise((resolve) => {
    execFile(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd, timeout: 3000 },
      (error, stdout) => {
        if (error) {
          branchCache.set(cwd, { branch: null, expiresAt: Date.now() + CACHE_TTL_MS })
          resolve(null)
          return
        }
        const branch = stdout.trim()
        const result = branch.length > 0 ? branch : null
        branchCache.set(cwd, { branch: result, expiresAt: Date.now() + CACHE_TTL_MS })
        resolve(result)
      },
    )
  })
}
