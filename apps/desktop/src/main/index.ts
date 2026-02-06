import { app, BrowserWindow } from 'electron'
import { setupIPC, disposeIPC, killAllTerminals } from './ipc'
import { createMainWindow, hardenSession } from './windowManager'

app.name = 'CodingIDE'

const gotTheLock = app.requestSingleInstanceLock()
let mainWindow: BrowserWindow | null = null

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    hardenSession()
    setupIPC()
    mainWindow = createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow()
      }
    })
  })

  // Secure webview creation: allow only with safe preferences
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      // Strip any dangerous preferences the webview might request
      delete webPreferences.preload
      delete (webPreferences as Record<string, unknown>)['preloadURL']
      webPreferences.nodeIntegration = false
      webPreferences.nodeIntegrationInSubFrames = false
      webPreferences.contextIsolation = true

      // Only allow webviews with an isolated partition (not the default session)
      if (!params.partition || !params.partition.startsWith('persist:browser')) {
        event.preventDefault()
      }
    })
  })

  app.on('window-all-closed', () => {
    // Kill all PTY processes when the last window closes.
    // On macOS the app stays alive (dock), so without this,
    // shells and dev servers would be orphaned until quit.
    killAllTerminals()
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    disposeIPC()
  })
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})
