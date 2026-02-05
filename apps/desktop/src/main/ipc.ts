import { app, BrowserWindow, dialog, Notification, shell } from 'electron'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { IPC_CHANNELS } from '../shared/ipcContracts'
import { IPCRouter } from './ipcRouter'
import { ProjectStore } from '@services/projectStore'
import { ThemeStore } from '@services/themeStore'
import { TerminalService } from '@services/terminalService'
import { TerminalLayoutStore } from '@services/terminalLayoutStore'
import { PresetStore } from '@services/presetStore'
import { TicketStore } from '@services/ticketStore'
import { SettingsStore } from '@services/settingsStore'
import { getGitBranch } from '@services/gitService'
import * as fileOps from '@services/fileOpsService'
import { setupRalphIPC } from './ipcRalph'
import { setupExpoIPC } from './ipcExpo'
import { MobileAppStore } from '@services/mobileAppStore'
import type { LayoutNode } from '../shared/terminalLayout'
import type { ProjectStatus, ProjectStatusChange } from '../shared/types'

let router: IPCRouter | null = null
let projectStore: ProjectStore | null = null
let themeStore: ThemeStore | null = null
let terminalService: TerminalService | null = null
let terminalLayoutStore: TerminalLayoutStore | null = null
let presetStore: PresetStore | null = null
let ticketStore: TicketStore | null = null
let settingsStore: SettingsStore | null = null
let mobileAppStore: MobileAppStore | null = null
let expoServiceRef: { expoService: import('@services/expoService').ExpoService } | null = null
let claudeActivityInterval: ReturnType<typeof setInterval> | null = null
let lastClaudeActivity: Record<string, number> = {}
let lastClaudeStatus: Record<string, string> = {}

/** Cached main window reference — avoids BrowserWindow.getAllWindows() on hot paths. */
let cachedMainWindow: BrowserWindow | null = null

/** Get the main renderer window, using a cached reference when possible. */
function getMainWindow(): BrowserWindow | null {
  if (cachedMainWindow && !cachedMainWindow.isDestroyed()) return cachedMainWindow
  cachedMainWindow = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null
  return cachedMainWindow
}

/** Send a message to the renderer, using the cached window reference. */
function sendToRenderer(channel: string, ...args: unknown[]): void {
  const win = getMainWindow()
  if (win) win.webContents.send(channel, ...args)
}

/** Shallow equality check for plain objects (string/number values) */
function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (a[key] !== b[key]) return false
  }
  return true
}

/** Broadcast a project status change to the renderer window */
function broadcastStatusChange(id: string, status: ProjectStatus): void {
  const change: ProjectStatusChange = { id, status }
  sendToRenderer('project:status-changed', change)
}

export function setupIPC(): void {
  router = new IPCRouter()
  projectStore = new ProjectStore(join(app.getPath('userData'), 'projects.json'))
  themeStore = new ThemeStore(join(app.getPath('userData'), 'theme.json'))
  terminalService = new TerminalService()
  terminalLayoutStore = new TerminalLayoutStore(
    join(app.getPath('userData'), 'terminal-layouts.json'),
  )
  presetStore = new PresetStore(join(app.getPath('userData'), 'command-presets.json'))
  const ticketStorePath = join(app.getPath('userData'), 'tickets.json')
  const settingsStorePath = join(app.getPath('userData'), 'settings.json')
  ticketStore = new TicketStore(ticketStorePath)
  settingsStore = new SettingsStore(settingsStorePath)
  mobileAppStore = new MobileAppStore(join(app.getPath('userData'), 'mobile-apps.json'))

  router.handle(IPC_CHANNELS.PING, () => 'pong')

  router.handle(IPC_CHANNELS.GET_APP_VERSION, () => app.getVersion())

  router.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  router.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  router.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  router.handle(IPC_CHANNELS.OPEN_FOLDER_DIALOG, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Open Project Folder',
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0] ?? null
  })

  router.handle(IPC_CHANNELS.GET_PROJECTS, () => {
    return projectStore!.getAll()
  })

  router.handle(IPC_CHANNELS.ADD_PROJECT, (_event, payload) => {
    return projectStore!.add(payload)
  })

  router.handle(IPC_CHANNELS.CREATE_PROJECT_FOLDER, async (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose where to create your project',
      buttonLabel: 'Create Here',
    })

    if (result.canceled || result.filePaths.length === 0) return null
    const parentDir = result.filePaths[0]
    if (!parentDir) return null

    const projectDir = join(parentDir, payload.name)
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true })
    }
    return projectDir
  })

  router.handle(IPC_CHANNELS.REMOVE_PROJECT, (_event, payload) => {
    terminalService!.killAllForProject(payload)
    projectStore!.remove(payload)
  })

  router.handle(IPC_CHANNELS.GET_GLOBAL_THEME, () => {
    return themeStore!.get()
  })

  router.handle(IPC_CHANNELS.SET_GLOBAL_THEME, (_event, payload) => {
    themeStore!.set(payload)
  })

  router.handle(IPC_CHANNELS.SET_PROJECT_THEME, (_event, payload) => {
    projectStore!.setTheme(payload.id, payload.theme)
  })

  // ── Terminal IPC ───────────────────────────────────────────

  // Forward PTY data to the renderer via cached window reference.
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

  terminalService!.onData((terminalId, data) => {
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

  terminalService!.onExit((terminalId, exitCode) => {
    sendToRenderer('terminal:exit', terminalId, exitCode)
  })

  router.handle(IPC_CHANNELS.TERMINAL_CREATE, (_event, payload) => {
    const created = terminalService!.create(
      payload.terminalId,
      payload.projectId,
      payload.cwd,
      payload.cols,
      payload.rows,
    )
    return { created }
  })

  router.handle(IPC_CHANNELS.TERMINAL_WRITE, (_event, payload) => {
    terminalService!.write(payload.terminalId, payload.data)
  })

  router.handle(IPC_CHANNELS.TERMINAL_RESIZE, (_event, payload) => {
    terminalService!.resize(payload.terminalId, payload.cols, payload.rows)
  })

  router.handle(IPC_CHANNELS.TERMINAL_KILL, (_event, payload) => {
    terminalService!.kill(payload.terminalId)
  })

  router.handle(IPC_CHANNELS.TERMINAL_KILL_ALL, (_event, payload) => {
    terminalService!.killAllForProject(payload)
  })

  router.handle(IPC_CHANNELS.TERMINAL_GET_BUFFER, (_event, payload) => {
    return terminalService!.getBuffer(payload.terminalId)
  })

  router.handle(IPC_CHANNELS.TERMINAL_GET_LAYOUT, (_event, payload) => {
    return terminalLayoutStore!.get(payload.projectId)
  })

  router.handle(IPC_CHANNELS.TERMINAL_SET_LAYOUT, (_event, payload) => {
    terminalLayoutStore!.set(payload.projectId, payload.layout as LayoutNode)
  })

  // ── Notifications IPC ────────────────────────────────────────
  router.handle(IPC_CHANNELS.NATIVE_NOTIFY, (_event, payload) => {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: payload.title,
        body: payload.body,
        silent: true,
      })
      notification.show()
    }
  })

  // ── Shell IPC ────────────────────────────────────────────────
  router.handle(IPC_CHANNELS.OPEN_EXTERNAL_URL, async (_event, payload) => {
    const url = typeof payload === 'string' ? payload : ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url)
    }
  })

  // ── Git IPC ──────────────────────────────────────────────────
  router.handle(IPC_CHANNELS.GIT_BRANCH, async (_event, payload) => {
    return { branch: await getGitBranch(payload.cwd) }
  })

  // ── Command Presets IPC ─────────────────────────────────────
  router.handle(IPC_CHANNELS.GET_PRESETS, () => {
    return presetStore!.getAll()
  })

  router.handle(IPC_CHANNELS.SET_PRESETS, (_event, payload) => {
    presetStore!.setAll(payload.presets)
  })

  // ── Project Status IPC ─────────────────────────────────────
  router.handle(IPC_CHANNELS.SET_PROJECT_STATUS, (_event, payload) => {
    projectStore!.setStatus(payload.id, payload.status)
    broadcastStatusChange(payload.id, payload.status)
  })

  // ── Browser IPC ────────────────────────────────────────────────
  // Navigate is a no-op in the main process — the renderer handles
  // webview navigation directly. The channel exists so the contract
  // and validator pipeline remain consistent.
  router.handle(IPC_CHANNELS.BROWSER_NAVIGATE, () => {})

  router.handle(IPC_CHANNELS.SET_PROJECT_BROWSER, (_event, payload) => {
    projectStore!.setBrowser(payload.id, payload.browserUrl, payload.browserViewMode)
  })

  // ── Kanban Ticket CRUD IPC ──────────────────────────────────
  router.handle(IPC_CHANNELS.TICKET_GET_ALL, () => {
    return ticketStore!.getAll()
  })

  router.handle(IPC_CHANNELS.TICKET_CREATE, (_event, payload) => {
    return ticketStore!.create(payload)
  })

  router.handle(IPC_CHANNELS.TICKET_UPDATE, (_event, payload) => {
    ticketStore!.update(payload.id, payload)
  })

  router.handle(IPC_CHANNELS.TICKET_DELETE, (_event, payload) => {
    ticketStore!.delete(payload)
  })

  router.handle(IPC_CHANNELS.TICKET_TRANSITION, (_event, payload) => {
    ticketStore!.transition(payload.id, payload.status)
  })

  router.handle(IPC_CHANNELS.TICKET_REORDER, (_event, payload) => {
    return ticketStore!.reorder(payload.id, payload.status, payload.index)
  })

  // ── Settings IPC ───────────────────────────────────────────
  router.handle(IPC_CHANNELS.GET_OPENAI_KEY, () => {
    return settingsStore!.getOpenAIKey()
  })

  router.handle(IPC_CHANNELS.SET_OPENAI_KEY, (_event, payload) => {
    settingsStore!.setOpenAIKey(payload.key)
  })

  router.handle(IPC_CHANNELS.GET_CLAUDE_KEY, () => {
    return settingsStore!.getClaudeKey()
  })

  router.handle(IPC_CHANNELS.SET_CLAUDE_KEY, (_event, payload) => {
    settingsStore!.setClaudeKey(payload.key)
  })

  // ── File Operations IPC ───────────────────────────────────────
  router.handle(IPC_CHANNELS.FILE_CREATE, async (_event, payload) => {
    const project = projectStore!.getById(payload.projectId)
    if (!project)
      return { ok: false, error: { code: 'UNKNOWN' as const, message: 'Project not found' } }
    return fileOps.createFile(project.path, payload.relPath, payload.contents, payload.mkdirp)
  })

  router.handle(IPC_CHANNELS.FILE_READ, async (_event, payload) => {
    const project = projectStore!.getById(payload.projectId)
    if (!project)
      return { ok: false, error: { code: 'UNKNOWN' as const, message: 'Project not found' } }
    return fileOps.readFile(project.path, payload.relPath)
  })

  router.handle(IPC_CHANNELS.FILE_WRITE, async (_event, payload) => {
    const project = projectStore!.getById(payload.projectId)
    if (!project)
      return { ok: false, error: { code: 'UNKNOWN' as const, message: 'Project not found' } }
    return fileOps.writeFile(project.path, payload.relPath, payload.contents, payload.mode)
  })

  router.handle(IPC_CHANNELS.FILE_LIST, (_event, payload) => {
    const project = projectStore!.getById(payload.projectId)
    if (!project) return []
    try {
      return fileOps.listDir(project.path, payload.dirPath)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[FILE_LIST] listDir failed for "${project.path}/${payload.dirPath}":`, msg)
      throw err
    }
  })

  // ── Ralph / PRD IPC ─────────────────────────────────────────
  setupRalphIPC(router, ticketStore!, settingsStore!, projectStore!, getMainWindow)

  // ── App Builder / Expo IPC ─────────────────────────────────
  expoServiceRef = setupExpoIPC(router, mobileAppStore!, projectStore!, getMainWindow)

  // ── Auto-status: terminal busy → running, command done → idle ──
  terminalService!.onCommandDone((event) => {
    sendToRenderer('terminal:command-done', event)
    // Auto-set project to idle when command finishes (unless Claude is active)
    const activity = lastClaudeActivity[event.projectId] ?? 0
    if (activity === 0) {
      projectStore!.setStatus(event.projectId, 'idle')
      broadcastStatusChange(event.projectId, 'idle')
    }
  })

  // ── Claude Activity Polling ─────────────────────────────────
  claudeActivityInterval = setInterval(async () => {
    if (!terminalService) return

    // Early exit: skip poll if no terminals exist
    if (!terminalService.hasAny()) {
      // Clear stale data if terminals were destroyed
      if (Object.keys(lastClaudeActivity).length > 0) {
        lastClaudeActivity = {}
        lastClaudeStatus = {}
        sendToRenderer('claude:activity', {})
        sendToRenderer('claude:status', {})
      }
      return
    }

    const { activity, status: statusMap } = await terminalService.getClaudeFullStatus()

    // Detect status transitions from Claude activity changes
    for (const projectId of Object.keys(activity)) {
      const prev = lastClaudeActivity[projectId] ?? 0
      if (prev === 0 && (activity[projectId] ?? 0) > 0) {
        projectStore!.setStatus(projectId, 'running')
        broadcastStatusChange(projectId, 'running')
      }
    }
    for (const projectId of Object.keys(lastClaudeActivity)) {
      if ((lastClaudeActivity[projectId] ?? 0) > 0 && (activity[projectId] ?? 0) === 0) {
        projectStore!.setStatus(projectId, 'done')
        broadcastStatusChange(projectId, 'done')
        sendToRenderer('claude:done', { projectId })
      }
    }

    // Only broadcast if values actually changed (avoids ~95% of unnecessary IPC)
    const activityChanged = !shallowEqual(
      activity as Record<string, unknown>,
      lastClaudeActivity as Record<string, unknown>,
    )
    const statusChanged = !shallowEqual(
      statusMap as Record<string, unknown>,
      lastClaudeStatus as Record<string, unknown>,
    )

    lastClaudeActivity = { ...activity }
    lastClaudeStatus = { ...statusMap }

    if (activityChanged || statusChanged) {
      if (activityChanged) sendToRenderer('claude:activity', activity)
      if (statusChanged) sendToRenderer('claude:status', statusMap)
    }
  }, 3000)
}

export async function disposeIPC(): Promise<void> {
  if (claudeActivityInterval) {
    clearInterval(claudeActivityInterval)
    claudeActivityInterval = null
  }
  if (expoServiceRef) {
    await expoServiceRef.expoService.stopAll()
    expoServiceRef = null
  }
  mobileAppStore?.flush()
  terminalService?.killAll()
  projectStore?.flush()
  themeStore?.flush()
  terminalLayoutStore?.flush()
  presetStore?.flush()
  ticketStore?.flush()
  settingsStore?.flush()
  lastClaudeStatus = {}
  cachedMainWindow = null
  router?.dispose()
  router = null
  projectStore = null
  themeStore = null
  terminalService = null
  terminalLayoutStore = null
  presetStore = null
  ticketStore = null
  settingsStore = null
  mobileAppStore = null
  lastClaudeActivity = {}
}
