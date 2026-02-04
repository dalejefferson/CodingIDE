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
import { getGitBranch } from '@services/gitService'
import type { LayoutNode } from '../shared/terminalLayout'
import type { ProjectStatus, ProjectStatusChange } from '../shared/types'

let router: IPCRouter | null = null
let projectStore: ProjectStore | null = null
let themeStore: ThemeStore | null = null
let terminalService: TerminalService | null = null
let terminalLayoutStore: TerminalLayoutStore | null = null
let presetStore: PresetStore | null = null
let claudeActivityInterval: ReturnType<typeof setInterval> | null = null
let lastClaudeActivity: Record<string, number> = {}

/** Broadcast a project status change to all renderer windows */
function broadcastStatusChange(id: string, status: ProjectStatus): void {
  const change: ProjectStatusChange = { id, status }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('project:status-changed', change)
    }
  }
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

  // Forward PTY data to the renderer via webContents.send
  terminalService!.onData((terminalId, data) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:data', terminalId, data)
      }
    }
  })

  terminalService!.onExit((terminalId, exitCode) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:exit', terminalId, exitCode)
      }
    }
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

  // ── Auto-status: terminal busy → running, command done → idle ──
  terminalService!.onCommandDone((event) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:command-done', event)
      }
    }
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
    const activity = await terminalService.getClaudeActivity()
    const statusMap = await terminalService.getClaudeOutputStatus()

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
        // Notify renderer that Claude finished generating for this project
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) {
            win.webContents.send('claude:done', { projectId })
          }
        }
      }
    }
    lastClaudeActivity = { ...activity }

    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('claude:activity', activity)
        win.webContents.send('claude:status', statusMap)
      }
    }
  }, 3000)
}

export function disposeIPC(): void {
  if (claudeActivityInterval) {
    clearInterval(claudeActivityInterval)
    claudeActivityInterval = null
  }
  terminalService?.killAll()
  router?.dispose()
  router = null
  projectStore = null
  themeStore = null
  terminalService = null
  terminalLayoutStore = null
  presetStore = null
  lastClaudeActivity = {}
}
