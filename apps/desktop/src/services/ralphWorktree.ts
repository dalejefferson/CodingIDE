/**
 * Git worktree creation for the Ralph Loop service.
 *
 * Creates isolated worktree directories for tickets, initializes
 * a git repo, and writes a README with ticket context.
 */

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Ticket } from '@shared/types'
import { logger } from '@services/logger'

/** Max length for slugified directory names. */
const MAX_SLUG_LENGTH = 50

/**
 * Convert a string to a filesystem-safe slug.
 *
 * Rules: lowercase, non-alphanumeric chars become hyphens, collapse
 * consecutive hyphens, trim leading/trailing hyphens, cap at 50 chars.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
}

/**
 * Run `git init` in the given directory.
 *
 * Uses `spawn` instead of `execSync` so the main process event loop
 * is never blocked while the child process runs.
 */
function gitInit(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', ['init'], { cwd, stdio: 'pipe' })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`git init exited with code ${code}`))
    })
    proc.on('error', reject)
  })
}

/**
 * Create an isolated worktree directory for a ticket.
 *
 * The directory is placed at `{ticket.worktreeBasePath}/{slug}/` where
 * slug is derived from the ticket title. A bare `git init` is run and
 * a README.md is written with the ticket metadata.
 *
 * @returns The full path to the created worktree directory.
 */
export async function createWorktree(ticket: Ticket): Promise<string> {
  if (!ticket.worktreeBasePath) {
    throw new Error(`Ticket "${ticket.id}" has no worktreeBasePath set`)
  }

  const slug = slugify(ticket.title)
  if (!slug) {
    throw new Error(`Ticket title "${ticket.title}" produces an empty slug`)
  }

  const worktreePath = join(ticket.worktreeBasePath, slug)

  // Create directory (recursive in case basePath doesn't exist yet)
  await mkdir(worktreePath, { recursive: true })

  // Initialize a git repo in the worktree
  try {
    await gitInit(worktreePath)
    logger.info('Ralph: git init in worktree', { worktreePath })
  } catch (err) {
    logger.error('Ralph: git init failed', {
      worktreePath,
      error: String(err),
    })
    throw new Error(`git init failed in ${worktreePath}: ${String(err)}`)
  }

  // Write a README with ticket context
  const readme = [
    `# ${ticket.title}`,
    '',
    ticket.description,
    '',
    '---',
    `Ticket ID: ${ticket.id}`,
    `Type: ${ticket.type}`,
    `Priority: ${ticket.priority}`,
  ].join('\n')

  await writeFile(join(worktreePath, 'README.md'), readme, 'utf-8')
  logger.info('Ralph: worktree created', { worktreePath, ticketId: ticket.id })

  return worktreePath
}
