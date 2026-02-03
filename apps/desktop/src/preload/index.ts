import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, ALLOWED_CHANNELS } from '../shared/ipcContracts'
import type { Project, AddProjectRequest, ThemeId, SetProjectThemeRequest } from '../shared/types'

/**
 * Typed preload API — the only surface exposed to the renderer.
 *
 * Rules:
 *   - No raw ipcRenderer access is exposed.
 *   - Every method maps to exactly one declared IPC channel.
 *   - The internal safeInvoke helper rejects channels not in the allowlist
 *     as a defense-in-depth measure.
 */
export interface ElectronAPI {
  ping: () => Promise<string>
  getAppVersion: () => Promise<string>
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
  projects: {
    openFolderDialog: () => Promise<string | null>
    getAll: () => Promise<Project[]>
    add: (request: AddProjectRequest) => Promise<Project>
    remove: (id: string) => Promise<void>
  }
  theme: {
    getGlobal: () => Promise<ThemeId>
    setGlobal: (theme: ThemeId) => Promise<void>
    setProjectTheme: (request: SetProjectThemeRequest) => Promise<void>
  }
}

/** Only invoke channels that exist in the allowlist */
function safeInvoke(channel: string, ...args: unknown[]): Promise<unknown> {
  if (!ALLOWED_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`IPC channel not allowed: ${channel}`))
  }
  return ipcRenderer.invoke(channel, ...args)
}

const electronAPI: ElectronAPI = {
  ping: () => safeInvoke(IPC_CHANNELS.PING) as Promise<string>,
  getAppVersion: () => safeInvoke(IPC_CHANNELS.GET_APP_VERSION) as Promise<string>,
  window: {
    minimize: () => safeInvoke(IPC_CHANNELS.WINDOW_MINIMIZE) as Promise<void>,
    maximize: () => safeInvoke(IPC_CHANNELS.WINDOW_MAXIMIZE) as Promise<void>,
    close: () => safeInvoke(IPC_CHANNELS.WINDOW_CLOSE) as Promise<void>,
  },
  projects: {
    openFolderDialog: () => safeInvoke(IPC_CHANNELS.OPEN_FOLDER_DIALOG) as Promise<string | null>,
    getAll: () => safeInvoke(IPC_CHANNELS.GET_PROJECTS) as Promise<Project[]>,
    add: (request: AddProjectRequest) =>
      safeInvoke(IPC_CHANNELS.ADD_PROJECT, request) as Promise<Project>,
    remove: (id: string) => safeInvoke(IPC_CHANNELS.REMOVE_PROJECT, id) as Promise<void>,
  },
  theme: {
    getGlobal: () => safeInvoke(IPC_CHANNELS.GET_GLOBAL_THEME) as Promise<ThemeId>,
    setGlobal: (theme: ThemeId) =>
      safeInvoke(IPC_CHANNELS.SET_GLOBAL_THEME, theme) as Promise<void>,
    setProjectTheme: (request: SetProjectThemeRequest) =>
      safeInvoke(IPC_CHANNELS.SET_PROJECT_THEME, request) as Promise<void>,
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
