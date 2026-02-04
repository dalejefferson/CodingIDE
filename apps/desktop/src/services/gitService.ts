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

/**
 * Get the current git branch for a directory.
 * Returns null if not a git repo or on error.
 * Results are cached for 10 seconds per directory.
 */
export function getGitBranch(cwd: string): Promise<string | null> {
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
