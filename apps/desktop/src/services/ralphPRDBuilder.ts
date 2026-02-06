/**
 * PRD content builder for the Ralph Loop service.
 *
 * Generates the PRD markdown content from a ticket's metadata
 * and writes it to the `.claude/prd.md` file in the worktree.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Ticket } from '@shared/types'
import { logger } from '@services/logger'

/**
 * Build and write the PRD file for a ticket into the worktree's `.claude/` directory.
 *
 * Prerequisites:
 *   - `ticket.worktreePath` must be set (directory exists)
 *   - `ticket.prd` must be non-null and approved
 *
 * @returns The PRD content string that was written
 */
export function buildPRD(ticket: Ticket): string {
  if (!ticket.worktreePath) {
    throw new Error(`Ticket "${ticket.id}" has no worktreePath — create worktree first`)
  }
  if (!ticket.prd || !ticket.prd.approved) {
    throw new Error(`Ticket "${ticket.id}" has no approved PRD`)
  }

  const prdContent = ticket.prd.content
  const claudeDir = join(ticket.worktreePath, '.claude')
  mkdirSync(claudeDir, { recursive: true })
  writeFileSync(join(claudeDir, 'prd.md'), prdContent, 'utf-8')
  logger.info('Ralph: wrote PRD to .claude/prd.md', { ticketId: ticket.id })

  return prdContent
}
