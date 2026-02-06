/**
 * Miscellaneous Namespace Builders
 *
 * Builds the remaining small namespaces for the preload API:
 * theme, notify, git, shell, presets, browser, claude, settings,
 * fileOps, ideas, and top-level methods (ping, getAppVersion, window).
 */

import { ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipcContracts'
import { safeInvoke } from '../safeInvoke'
import type { ElectronAPI } from '../types'
import type {
  ClaudeActivityMap,
  ClaudeStatusMap,
  ClaudeDoneEvent,
} from '../../shared/types'

export function buildTopLevelAPI(): Pick<ElectronAPI, 'ping' | 'getAppVersion' | 'window'> {
  return {
    ping: () => safeInvoke(IPC_CHANNELS.PING) as Promise<string>,
    getAppVersion: () => safeInvoke(IPC_CHANNELS.GET_APP_VERSION) as Promise<string>,
    window: {
      minimize: () => safeInvoke(IPC_CHANNELS.WINDOW_MINIMIZE) as Promise<void>,
      maximize: () => safeInvoke(IPC_CHANNELS.WINDOW_MAXIMIZE) as Promise<void>,
      close: () => safeInvoke(IPC_CHANNELS.WINDOW_CLOSE) as Promise<void>,
    },
  }
}

export function buildThemeAPI(): ElectronAPI['theme'] {
  return {
    getGlobal: () => safeInvoke(IPC_CHANNELS.GET_GLOBAL_THEME) as ReturnType<ElectronAPI['theme']['getGlobal']>,
    setGlobal: (theme) =>
      safeInvoke(IPC_CHANNELS.SET_GLOBAL_THEME, theme) as Promise<void>,
    setProjectTheme: (request) =>
      safeInvoke(IPC_CHANNELS.SET_PROJECT_THEME, request) as Promise<void>,
  }
}

export function buildNotifyAPI(): ElectronAPI['notify'] {
  return {
    native: (request) =>
      safeInvoke(IPC_CHANNELS.NATIVE_NOTIFY, request) as Promise<void>,
  }
}

export function buildGitAPI(): ElectronAPI['git'] {
  return {
    getBranch: (request) =>
      safeInvoke(IPC_CHANNELS.GIT_BRANCH, request) as ReturnType<ElectronAPI['git']['getBranch']>,
  }
}

export function buildShellAPI(): ElectronAPI['shell'] {
  return {
    openExternal: (url) => safeInvoke(IPC_CHANNELS.OPEN_EXTERNAL_URL, url) as Promise<void>,
  }
}

export function buildPresetsAPI(): ElectronAPI['presets'] {
  return {
    getAll: () => safeInvoke(IPC_CHANNELS.GET_PRESETS) as ReturnType<ElectronAPI['presets']['getAll']>,
    setAll: (presets) =>
      safeInvoke(IPC_CHANNELS.SET_PRESETS, { presets }) as Promise<void>,
  }
}

export function buildBrowserAPI(): ElectronAPI['browser'] {
  return {
    navigate: (request) =>
      safeInvoke(IPC_CHANNELS.BROWSER_NAVIGATE, request) as Promise<void>,
    setProjectBrowser: (request) =>
      safeInvoke(IPC_CHANNELS.SET_PROJECT_BROWSER, request) as Promise<void>,
  }
}

export function buildClaudeAPI(): ElectronAPI['claude'] {
  return {
    onActivity: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, activity: ClaudeActivityMap) => {
        callback(activity)
      }
      ipcRenderer.on('claude:activity', listener)
      return () => {
        ipcRenderer.removeListener('claude:activity', listener)
      }
    },
    onStatus: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, status: ClaudeStatusMap) => {
        callback(status)
      }
      ipcRenderer.on('claude:status', listener)
      return () => {
        ipcRenderer.removeListener('claude:status', listener)
      }
    },
    onDone: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, event: ClaudeDoneEvent) => {
        callback(event)
      }
      ipcRenderer.on('claude:done', listener)
      return () => {
        ipcRenderer.removeListener('claude:done', listener)
      }
    },
  }
}

export function buildSettingsAPI(): ElectronAPI['settings'] {
  return {
    getOpenAIKey: () => safeInvoke(IPC_CHANNELS.GET_OPENAI_KEY) as Promise<string | null>,
    setOpenAIKey: (key) =>
      safeInvoke(IPC_CHANNELS.SET_OPENAI_KEY, { key }) as Promise<void>,
    getClaudeKey: () => safeInvoke(IPC_CHANNELS.GET_CLAUDE_KEY) as Promise<string | null>,
    setClaudeKey: (key) =>
      safeInvoke(IPC_CHANNELS.SET_CLAUDE_KEY, { key }) as Promise<void>,
  }
}

export function buildFileOpsAPI(): ElectronAPI['fileOps'] {
  return {
    createFile: (request) =>
      safeInvoke(IPC_CHANNELS.FILE_CREATE, request) as ReturnType<ElectronAPI['fileOps']['createFile']>,
    readFile: (request) =>
      safeInvoke(IPC_CHANNELS.FILE_READ, request) as ReturnType<ElectronAPI['fileOps']['readFile']>,
    writeFile: (request) =>
      safeInvoke(IPC_CHANNELS.FILE_WRITE, request) as ReturnType<ElectronAPI['fileOps']['writeFile']>,
    listDir: (request) =>
      safeInvoke(IPC_CHANNELS.FILE_LIST, request) as ReturnType<ElectronAPI['fileOps']['listDir']>,
  }
}

export function buildIdeasAPI(): ElectronAPI['ideas'] {
  return {
    getAll: () => safeInvoke(IPC_CHANNELS.IDEA_GET_ALL) as ReturnType<ElectronAPI['ideas']['getAll']>,
    create: (request) =>
      safeInvoke(IPC_CHANNELS.IDEA_CREATE, request) as ReturnType<ElectronAPI['ideas']['create']>,
    update: (request) =>
      safeInvoke(IPC_CHANNELS.IDEA_UPDATE, request) as Promise<void>,
    delete: (id) => safeInvoke(IPC_CHANNELS.IDEA_DELETE, id) as Promise<void>,
    deleteByProjectId: (projectId) =>
      safeInvoke(IPC_CHANNELS.IDEA_DELETE_BY_PROJECT, projectId) as Promise<number>,
  }
}

export function buildPortsAPI(): ElectronAPI['ports'] {
  return {
    check: (request) =>
      safeInvoke(IPC_CHANNELS.PORT_CHECK, request) as ReturnType<ElectronAPI['ports']['check']>,
    findAvailable: (request) =>
      safeInvoke(IPC_CHANNELS.PORT_FIND_AVAILABLE, request) as ReturnType<
        ElectronAPI['ports']['findAvailable']
      >,
    register: (request) =>
      safeInvoke(IPC_CHANNELS.PORT_REGISTER, request) as Promise<void>,
    unregister: (request) =>
      safeInvoke(IPC_CHANNELS.PORT_UNREGISTER, request) as Promise<void>,
    getOwner: (request) =>
      safeInvoke(IPC_CHANNELS.PORT_GET_OWNER, request) as ReturnType<
        ElectronAPI['ports']['getOwner']
      >,
  }
}
