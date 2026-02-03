import { app, BrowserWindow, dialog } from 'electron'
import { join } from 'node:path'
import { IPC_CHANNELS } from '../shared/ipcContracts'
import { IPCRouter } from './ipcRouter'
import { ProjectStore } from '@services/projectStore'
import { ThemeStore } from '@services/themeStore'
import { TerminalService } from '@services/terminalService'
import { TerminalLayoutStore } from '@services/terminalLayoutStore'
import { getGitBranch } from '@services/gitService'
import type { LayoutNode } from '../shared/terminalLayout'

let router: IPCRouter | null = null
let projectStore: ProjectStore | null = null
let themeStore: ThemeStore | null = null
let terminalService: TerminalService | null = null
let terminalLayoutStore: TerminalLayoutStore | null = null

export function setupIPC(): void {
  router = new IPCRouter()
  projectStore = new ProjectStore(join(app.getPath('userData'), 'projects.json'))
  themeStore = new ThemeStore(join(app.getPath('userData'), 'theme.json'))
  terminalService = new TerminalService()
  terminalLayoutStore = new TerminalLayoutStore(
    join(app.getPath('userData'), 'terminal-layouts.json'),
  )

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

  router.handle(IPC_CHANNELS.REMOVE_PROJECT, (_event, payload) => {
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
    terminalService!.create(
      payload.terminalId,
      payload.projectId,
      payload.cwd,
      payload.cols,
      payload.rows,
    )
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

  // ── Git IPC ──────────────────────────────────────────────────
  router.handle(IPC_CHANNELS.GIT_BRANCH, async (_event, payload) => {
    return { branch: await getGitBranch(payload.cwd) }
  })
}

export function disposeIPC(): void {
  terminalService?.killAll()
  router?.dispose()
  router = null
  projectStore = null
  themeStore = null
  terminalService = null
  terminalLayoutStore = null
}
