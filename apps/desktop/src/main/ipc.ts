import { app, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipcContracts'
import { IPCRouter } from './ipcRouter'

let router: IPCRouter | null = null

export function setupIPC(): void {
  router = new IPCRouter()

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
}

export function disposeIPC(): void {
  router?.dispose()
  router = null
}
