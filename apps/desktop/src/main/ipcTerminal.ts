/**
 * Terminal IPC Handlers
 *
 * Registers handlers for terminal CRUD, data batching (microtask
 * coalescing to reduce IPC overhead), exit forwarding, layout
 * persistence, and the auto-status command-done hook.
 */

import { IPC_CHANNELS } from '../shared/ipcContracts'
import type { IPCRouter } from './ipcRouter'
import type { TerminalService } from '@services/terminalService'
import type { TerminalLayoutStore } from '@services/terminalLayoutStore'
import type { LayoutNode } from '../shared/terminalLayout'

export function setupTerminalIPC(
  router: IPCRouter,
  terminalService: TerminalService,
  terminalLayoutStore: TerminalLayoutStore,
  getMainWindow: () => import('electron').BrowserWindow | null,
  sendToRenderer: (channel: string, ...args: unknown[]) => void,
  getLastClaudeActivity: () => Record<string, number>,
  onCommandDoneStatusCallback: (projectId: string) => void,
): void {
  // ── Data Batching ──────────────────────────────────────────
  // Batch chunks per terminal within a microtask to reduce IPC overhead
  // during fast output (builds, npm install, large logs).
  const pendingTermData = new Map<string, string[]>()
  let termDataFlushScheduled = false

  function flushTermData(): void {
    termDataFlushScheduled = false
    const win = getMainWindow()
    if (!win) {
      pendingTermData.clear()
      return
    }
    for (const [tid, chunks] of pendingTermData) {
      win.webContents.send('terminal:data', tid, chunks.join(''))
    }
    pendingTermData.clear()
  }

  terminalService.onData((terminalId, data) => {
    let arr = pendingTermData.get(terminalId)
    if (!arr) {
      arr = []
      pendingTermData.set(terminalId, arr)
    }
    arr.push(data)
    if (!termDataFlushScheduled) {
      termDataFlushScheduled = true
      queueMicrotask(flushTermData)
    }
  })

  terminalService.onExit((terminalId, exitCode) => {
    sendToRenderer('terminal:exit', terminalId, exitCode)
  })

  // ── Terminal CRUD ─────────────────────────────────────────
  router.handle(IPC_CHANNELS.TERMINAL_CREATE, (_event, payload) => {
    const created = terminalService.create(
      payload.terminalId,
      payload.projectId,
      payload.cwd,
      payload.cols,
      payload.rows,
    )
    return { created }
  })

  router.handle(IPC_CHANNELS.TERMINAL_WRITE, (_event, payload) => {
    terminalService.write(payload.terminalId, payload.data)
  })

  router.handle(IPC_CHANNELS.TERMINAL_RESIZE, (_event, payload) => {
    terminalService.resize(payload.terminalId, payload.cols, payload.rows)
  })

  router.handle(IPC_CHANNELS.TERMINAL_KILL, (_event, payload) => {
    terminalService.kill(payload.terminalId)
  })

  router.handle(IPC_CHANNELS.TERMINAL_KILL_ALL, (_event, payload) => {
    terminalService.killAllForProject(payload)
  })

  router.handle(IPC_CHANNELS.TERMINAL_GET_BUFFER, (_event, payload) => {
    return terminalService.getBuffer(payload.terminalId)
  })

  // ── Layout Persistence ────────────────────────────────────
  router.handle(IPC_CHANNELS.TERMINAL_GET_LAYOUT, (_event, payload) => {
    return terminalLayoutStore.get(payload.projectId)
  })

  router.handle(IPC_CHANNELS.TERMINAL_SET_LAYOUT, (_event, payload) => {
    terminalLayoutStore.set(payload.projectId, payload.layout as LayoutNode)
  })

  // ── Auto-status: command done → idle (unless Claude active) ──
  terminalService.onCommandDone((event) => {
    sendToRenderer('terminal:command-done', event)
    const activity = getLastClaudeActivity()[event.projectId] ?? 0
    if (activity === 0) {
      onCommandDoneStatusCallback(event.projectId)
    }
  })
}
