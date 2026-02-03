/**
 * Git Service — reads git metadata safely via execFile (no shell).
 */

import { execFile } from 'node:child_process'

/**
 * Get the current git branch for a directory.
 * Returns null if not a git repo or on error.
 */
export function getGitBranch(cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd, timeout: 3000 },
      (error, stdout) => {
        if (error) {
          resolve(null)
          return
        }
        const branch = stdout.trim()
        resolve(branch.length > 0 ? branch : null)
      },
    )
  })
}
