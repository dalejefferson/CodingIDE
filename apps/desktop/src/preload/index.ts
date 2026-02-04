import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, ALLOWED_CHANNELS } from '../shared/ipcContracts'
import type {
  Project,
  AddProjectRequest,
  GitBranchRequest,
  GitBranchResponse,
  ThemeId,
  SetProjectThemeRequest,
  TerminalCreateRequest,
  TerminalWriteRequest,
  TerminalResizeRequest,
  CommandCompletionEvent,
  NativeNotifyRequest,
  ClaudeActivityMap,
  CommandPreset,
} from '../shared/types'
import type { LayoutNode } from '../shared/terminalLayout'

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
  terminal: {
    create: (request: TerminalCreateRequest) => Promise<void>
    write: (request: TerminalWriteRequest) => Promise<void>
    resize: (request: TerminalResizeRequest) => Promise<void>
    kill: (terminalId: string) => Promise<void>
    killAll: (projectId: string) => Promise<void>
    getBuffer: (terminalId: string) => Promise<string>
    getLayout: (projectId: string) => Promise<LayoutNode | null>
    setLayout: (projectId: string, layout: LayoutNode) => Promise<void>
    onData: (callback: (terminalId: string, data: string) => void) => () => void
    onExit: (callback: (terminalId: string, exitCode: number) => void) => () => void
    onCommandDone: (callback: (event: CommandCompletionEvent) => void) => () => void
  }
  notify: {
    native: (request: NativeNotifyRequest) => Promise<void>
  }
  git: {
    getBranch: (request: GitBranchRequest) => Promise<GitBranchResponse>
  }
  shell: {
    openExternal: (url: string) => Promise<void>
  }
  presets: {
    getAll: () => Promise<CommandPreset[]>
    setAll: (presets: CommandPreset[]) => Promise<void>
  }
  claude: {
    onActivity: (callback: (activity: ClaudeActivityMap) => void) => () => void
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
  terminal: {
    create: (request: TerminalCreateRequest) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_CREATE, request) as Promise<void>,
    write: (request: TerminalWriteRequest) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_WRITE, request) as Promise<void>,
    resize: (request: TerminalResizeRequest) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_RESIZE, request) as Promise<void>,
    kill: (terminalId: string) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_KILL, { terminalId }) as Promise<void>,
    killAll: (projectId: string) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_KILL_ALL, projectId) as Promise<void>,
    getBuffer: (terminalId: string) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_GET_BUFFER, { terminalId }) as Promise<string>,
    getLayout: (projectId: string) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_GET_LAYOUT, { projectId }) as Promise<LayoutNode | null>,
    setLayout: (projectId: string, layout: LayoutNode) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_SET_LAYOUT, { projectId, layout }) as Promise<void>,
    onData: (callback: (terminalId: string, data: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, terminalId: string, data: string) => {
        callback(terminalId, data)
      }
      ipcRenderer.on('terminal:data', listener)
      return () => {
        ipcRenderer.removeListener('terminal:data', listener)
      }
    },
    onExit: (callback: (terminalId: string, exitCode: number) => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        terminalId: string,
        exitCode: number,
      ) => {
        callback(terminalId, exitCode)
      }
      ipcRenderer.on('terminal:exit', listener)
      return () => {
        ipcRenderer.removeListener('terminal:exit', listener)
      }
    },
    onCommandDone: (callback: (event: CommandCompletionEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, event: CommandCompletionEvent) => {
        callback(event)
      }
      ipcRenderer.on('terminal:command-done', listener)
      return () => {
        ipcRenderer.removeListener('terminal:command-done', listener)
      }
    },
  },
  notify: {
    native: (request: NativeNotifyRequest) =>
      safeInvoke(IPC_CHANNELS.NATIVE_NOTIFY, request) as Promise<void>,
  },
  git: {
    getBranch: (request: GitBranchRequest) =>
      safeInvoke(IPC_CHANNELS.GIT_BRANCH, request) as Promise<GitBranchResponse>,
  },
  shell: {
    openExternal: (url: string) => safeInvoke(IPC_CHANNELS.OPEN_EXTERNAL_URL, url) as Promise<void>,
  },
  presets: {
    getAll: () => safeInvoke(IPC_CHANNELS.GET_PRESETS) as Promise<CommandPreset[]>,
    setAll: (presets: CommandPreset[]) =>
      safeInvoke(IPC_CHANNELS.SET_PRESETS, { presets }) as Promise<void>,
  },
  claude: {
    onActivity: (callback: (activity: ClaudeActivityMap) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, activity: ClaudeActivityMap) => {
        callback(activity)
      }
      ipcRenderer.on('claude:activity', listener)
      return () => {
        ipcRenderer.removeListener('claude:activity', listener)
      }
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
