/**
 * Project / Theme / Status / Folder IPC Handlers
 *
 * Registers handlers for project CRUD, folder dialogs,
 * global and per-project theme management, project status,
 * browser URL persistence, and notification/shell/git/preset channels.
 */

import { app, BrowserWindow, dialog, Notification, shell } from 'electron'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { IPC_CHANNELS } from '../shared/ipcContracts'
import { getGitBranch } from '@services/gitService'
import { PresetStore } from '@services/presetStore'
import type { IPCRouter } from './ipcRouter'
import type { ProjectStore } from '@services/projectStore'
import type { ThemeStore } from '@services/themeStore'
import type { TerminalService } from '@services/terminalService'

/** Lazy-initialised PresetStore — only created when command presets are accessed. */
let presetStore: PresetStore | null = null

function getPresetStore(): PresetStore {
  if (!presetStore)
    presetStore = new PresetStore(join(app.getPath('userData'), 'command-presets.json'))
  return presetStore
}

export function setupProjectIPC(
  router: IPCRouter,
  projectStore: ProjectStore,
  themeStore: ThemeStore,
  terminalService: TerminalService,
  sendToRenderer: (channel: string, ...args: unknown[]) => void,
): void {
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
    return projectStore.getAll()
  })

  router.handle(IPC_CHANNELS.ADD_PROJECT, (_event, payload) => {
    return projectStore.add(payload)
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
    terminalService.killAllForProject(payload)
    projectStore.remove(payload)
  })

  router.handle(IPC_CHANNELS.GET_GLOBAL_THEME, () => {
    return themeStore.get()
  })

  router.handle(IPC_CHANNELS.SET_GLOBAL_THEME, (_event, payload) => {
    themeStore.set(payload)
  })

  router.handle(IPC_CHANNELS.SET_PROJECT_THEME, (_event, payload) => {
    projectStore.setTheme(payload.id, payload.theme)
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
    return getPresetStore().getAll()
  })

  router.handle(IPC_CHANNELS.SET_PRESETS, (_event, payload) => {
    getPresetStore().setAll(payload.presets)
  })

  // ── Project Status IPC ─────────────────────────────────────
  router.handle(IPC_CHANNELS.SET_PROJECT_STATUS, (_event, payload) => {
    projectStore.setStatus(payload.id, payload.status)
    const change = { id: payload.id, status: payload.status }
    sendToRenderer('project:status-changed', change)
  })

  // ── Browser IPC ────────────────────────────────────────────────
  router.handle(IPC_CHANNELS.BROWSER_NAVIGATE, () => {})

  router.handle(IPC_CHANNELS.SET_PROJECT_BROWSER, (_event, payload) => {
    projectStore.setBrowser(payload.id, payload.browserUrl, payload.browserViewMode)
  })
}

/** Flush the lazy PresetStore if it was created. */
export function flushPresetStore(): void {
  presetStore?.flush()
  presetStore = null
}
