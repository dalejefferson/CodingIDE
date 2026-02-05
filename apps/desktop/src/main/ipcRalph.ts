/**
 * Ralph / PRD IPC Handlers
 *
 * Registers handlers for PRD generation, Ralph Loop execution,
 * worktree directory selection, and ticket-to-project bridging.
 */

import { BrowserWindow, dialog } from 'electron'
import { IPC_CHANNELS } from '../shared/ipcContracts'
import { generatePRD, type PRDProvider } from '@services/prdService'
import { RalphService } from '@services/ralphService'
import type { IPCRouter } from './ipcRouter'
import type { TicketStore } from '@services/ticketStore'
import type { SettingsStore } from '@services/settingsStore'
import type { ProjectStore } from '@services/projectStore'

export function setupRalphIPC(
  router: IPCRouter,
  ticketStore: TicketStore,
  settingsStore: SettingsStore,
  projectStore: ProjectStore,
  getMainWindow: () => BrowserWindow | null,
): void {
  const ralphService = new RalphService((ticketId, running, iteration) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('ralph:status-changed', { ticketId, running, iteration })
    }
    // Auto-transition to in_testing when Ralph completes
    if (!running) {
      const ticket = ticketStore.getById(ticketId)
      if (ticket && ticket.status === 'in_progress') {
        ticketStore.transition(ticketId, 'in_testing')
        // Broadcast ticket status change
        if (win && !win.isDestroyed()) {
          const updated = ticketStore.getById(ticketId)
          if (updated) {
            win.webContents.send('ticket:status-changed', updated)
          }
        }
      }
    }
  })
  // ── PRD Generation ────────────────────────────────────────
  router.handle(IPC_CHANNELS.PRD_GENERATE, async (_event, payload) => {
    let apiKey: string | null = null
    let provider: PRDProvider = 'openai'

    // Prefer Claude key if set, fall back to OpenAI
    const claudeKey = settingsStore.getClaudeKey()
    const openaiKey = settingsStore.getOpenAIKey()

    if (claudeKey) {
      apiKey = claudeKey
      provider = 'anthropic'
    } else if (openaiKey) {
      apiKey = openaiKey
      provider = 'openai'
    }

    if (!apiKey) {
      throw new Error('No API key configured. Add an OpenAI or Claude key in Settings.')
    }

    const ticket = ticketStore.getById(payload.ticketId)
    if (!ticket) {
      throw new Error(`Ticket not found: ${payload.ticketId}`)
    }

    const prd = await generatePRD(apiKey, ticket, provider)
    ticketStore.setPRD(ticket.id, prd.content, prd.approved)
    return prd
  })

  // ── PRD Approve / Reject ─────────────────────────────────
  router.handle(IPC_CHANNELS.PRD_APPROVE, (_event, payload) => {
    ticketStore.approvePRD(payload.ticketId, true)
  })

  router.handle(IPC_CHANNELS.PRD_REJECT, (_event, payload) => {
    ticketStore.approvePRD(payload.ticketId, false)
  })

  // ── Ralph Execute ───────────────────────────────────────
  router.handle(IPC_CHANNELS.RALPH_EXECUTE, (_event, payload) => {
    const ticket = ticketStore.getById(payload.ticketId)
    if (!ticket) throw new Error(`Ticket not found: ${payload.ticketId}`)
    if (!ticket.prd || !ticket.prd.approved) throw new Error('PRD not approved')

    // If the frontend provides a worktreeBasePath, persist it on the ticket
    const basePath = payload.worktreeBasePath ?? ticket.worktreeBasePath
    if (basePath && !ticket.worktreeBasePath) {
      ticketStore.setWorktreePath(ticket.id, basePath, '')
    }

    // Create worktree if basePath is set but full path is not
    if (!ticket.worktreePath && basePath) {
      const withBase = { ...ticket, worktreeBasePath: basePath }
      const fullPath = ralphService.createWorktree(withBase)
      ticketStore.setWorktreePath(ticket.id, basePath, fullPath)
      // Re-read ticket with updated path
      const refreshed = ticketStore.getById(ticket.id)
      if (!refreshed?.worktreePath) throw new Error('Failed to create worktree')
      ralphService.execute(refreshed)
    } else if (ticket.worktreePath) {
      ralphService.execute(ticket)
    } else {
      throw new Error('Ticket has no worktree base path. Choose a directory first.')
    }
  })

  // ── Ralph Status ──────────────────────────────────────────
  router.handle(IPC_CHANNELS.RALPH_STATUS, (_event, payload) => {
    return ralphService.getStatus(payload.ticketId)
  })

  // ── Ralph Stop ────────────────────────────────────────────
  router.handle(IPC_CHANNELS.RALPH_STOP, (_event, payload) => {
    ralphService.stop(payload.ticketId)
  })

  // ── Choose Worktree Directory ────────────────────────────
  router.handle(IPC_CHANNELS.RALPH_CHOOSE_WORKTREE_DIR, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Choose where to create the Ralph worktree',
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0] ?? null
  })

  // ── Open Ticket as Project ───────────────────────────────
  router.handle(IPC_CHANNELS.TICKET_OPEN_AS_PROJECT, (_event, payload) => {
    const ticket = ticketStore.getById(payload.ticketId)
    if (!ticket || !ticket.worktreePath) {
      throw new Error(`Ticket ${payload.ticketId} has no worktree path`)
    }

    const project = projectStore.add({ path: ticket.worktreePath })

    // Tag with Ralph origin metadata
    project.origin = 'ralph-loop'
    project.ticketId = ticket.id

    return project
  })
}
