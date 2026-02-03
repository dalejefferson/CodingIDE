import { app, BrowserWindow, dialog } from 'electron'
import { join } from 'node:path'
import { IPC_CHANNELS } from '../shared/ipcContracts'
import { IPCRouter } from './ipcRouter'
import { ProjectStore } from '@services/projectStore'

let router: IPCRouter | null = null
let projectStore: ProjectStore | null = null

export function setupIPC(): void {
  router = new IPCRouter()
  projectStore = new ProjectStore(join(app.getPath('userData'), 'projects.json'))

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
}

export function disposeIPC(): void {
  router?.dispose()
  router = null
  projectStore = null
}
