import { BrowserWindow, screen, session, shell } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'

export function createMainWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  const mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.8),
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      navigateOnDragDrop: false,
      webviewTag: true,
    },
  })

  // Block in-page navigation (loadURL/loadFile don't trigger this)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow Vite HMR full-reloads in dev
    if (isDev && url.startsWith(process.env['ELECTRON_RENDERER_URL'] ?? '')) {
      return
    }
    event.preventDefault()
  })

  // Block new-window creation; open external links in OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Load the renderer
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist-renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  return mainWindow
}

/** Lock down session-level permissions — call after app.whenReady() */
export function hardenSession(): void {
  const ses = session.defaultSession

  // Deny all permission requests (camera, mic, geolocation, etc.)
  ses.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(false)
  })

  // Deny all synchronous permission checks
  ses.setPermissionCheckHandler(() => false)
}
