import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, ALLOWED_CHANNELS } from '../shared/ipcContracts'
import type {
  Project,
  AddProjectRequest,
  CreateProjectFolderRequest,
  GitBranchRequest,
  GitBranchResponse,
  ThemeId,
  SetProjectThemeRequest,
  SetProjectStatusRequest,
  SetProjectBrowserRequest,
  ProjectStatusChange,
  TerminalCreateRequest,
  TerminalWriteRequest,
  TerminalResizeRequest,
  CommandCompletionEvent,
  NativeNotifyRequest,
  ClaudeActivityMap,
  ClaudeStatusMap,
  ClaudeDoneEvent,
  CommandPreset,
  BrowserNavigateRequest,
  Ticket,
  CreateTicketRequest,
  UpdateTicketRequest,
  TransitionTicketRequest,
  ReorderTicketRequest,
  GeneratePRDRequest,
  ApprovePRDRequest,
  RalphExecuteRequest,
  RalphStatusRequest,
  RalphStatusResponse,
  RalphStopRequest,
  OpenTicketAsProjectRequest,
  PRD,
  FileCreateRequest,
  FileReadRequest,
  FileReadResponse,
  FileWriteRequest,
  FileOpsResult,
  FileListRequest,
  FileListResponse,
  MobileApp,
  CreateMobileAppRequest,
  AddMobileAppRequest,
  StartExpoRequest,
  StopExpoRequest,
  ExpoStatusRequest,
  ExpoStatusResponse,
  OpenMobileAppAsProjectRequest,
  TemplateStatusResponse,
  GenerateMobilePRDRequest,
  GenerateMobilePRDResponse,
  APIKeyStatusResponse,
  SavePRDRequest,
  CopyPRDImagesRequest,
  GenerateWordVomitPRDRequest,
  GenerateWordVomitPRDResponse,
  Idea,
  CreateIdeaRequest,
  UpdateIdeaRequest,
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
    createFolder: (request: CreateProjectFolderRequest) => Promise<string | null>
    getAll: () => Promise<Project[]>
    add: (request: AddProjectRequest) => Promise<Project>
    remove: (id: string) => Promise<void>
    setStatus: (request: SetProjectStatusRequest) => Promise<void>
    onStatusChanged: (callback: (change: ProjectStatusChange) => void) => () => void
  }
  theme: {
    getGlobal: () => Promise<ThemeId>
    setGlobal: (theme: ThemeId) => Promise<void>
    setProjectTheme: (request: SetProjectThemeRequest) => Promise<void>
  }
  terminal: {
    create: (request: TerminalCreateRequest) => Promise<{ created: boolean }>
    write: (request: TerminalWriteRequest) => Promise<void>
    resize: (request: TerminalResizeRequest) => Promise<void>
    kill: (terminalId: string) => Promise<void>
    killAll: (projectId: string) => Promise<void>
    getBuffer: (terminalId: string) => Promise<string>
    getLayout: (projectId: string) => Promise<LayoutNode | null>
    setLayout: (projectId: string, layout: LayoutNode) => Promise<void>
    onData: (terminalId: string, callback: (data: string) => void) => () => void
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
  browser: {
    navigate: (request: BrowserNavigateRequest) => Promise<void>
    setProjectBrowser: (request: SetProjectBrowserRequest) => Promise<void>
  }
  claude: {
    onActivity: (callback: (activity: ClaudeActivityMap) => void) => () => void
    onStatus: (callback: (status: ClaudeStatusMap) => void) => () => void
    onDone: (callback: (event: ClaudeDoneEvent) => void) => () => void
  }
  settings: {
    getOpenAIKey: () => Promise<string | null>
    setOpenAIKey: (key: string) => Promise<void>
    getClaudeKey: () => Promise<string | null>
    setClaudeKey: (key: string) => Promise<void>
  }
  fileOps: {
    createFile: (request: FileCreateRequest) => Promise<FileOpsResult>
    readFile: (request: FileReadRequest) => Promise<FileReadResponse | FileOpsResult>
    writeFile: (request: FileWriteRequest) => Promise<FileOpsResult>
    listDir: (request: FileListRequest) => Promise<FileListResponse>
  }
  tickets: {
    getAll: () => Promise<Ticket[]>
    create: (request: CreateTicketRequest) => Promise<Ticket>
    update: (request: UpdateTicketRequest) => Promise<void>
    delete: (id: string) => Promise<void>
    transition: (request: TransitionTicketRequest) => Promise<void>
    reorder: (request: ReorderTicketRequest) => Promise<Ticket[]>
    openAsProject: (request: OpenTicketAsProjectRequest) => Promise<Project>
    onStatusChanged: (callback: (ticket: Ticket) => void) => () => void
  }
  prd: {
    generate: (request: GeneratePRDRequest) => Promise<PRD>
    approve: (request: ApprovePRDRequest) => Promise<void>
    reject: (request: ApprovePRDRequest) => Promise<void>
  }
  ralph: {
    execute: (request: RalphExecuteRequest) => Promise<void>
    getStatus: (request: RalphStatusRequest) => Promise<RalphStatusResponse>
    stop: (request: RalphStopRequest) => Promise<void>
    chooseWorktreeDir: () => Promise<string | null>
    onStatusChanged: (
      callback: (data: { ticketId: string; running: boolean; iteration: number }) => void,
    ) => () => void
  }
  expo: {
    getAll: () => Promise<MobileApp[]>
    create: (request: CreateMobileAppRequest) => Promise<MobileApp>
    add: (request: AddMobileAppRequest) => Promise<MobileApp>
    remove: (id: string) => Promise<void>
    start: (request: StartExpoRequest) => Promise<void>
    stop: (request: StopExpoRequest) => Promise<void>
    getStatus: (request: ExpoStatusRequest) => Promise<ExpoStatusResponse>
    openFolderDialog: () => Promise<string | null>
    chooseParentDir: () => Promise<string | null>
    openAsProject: (request: OpenMobileAppAsProjectRequest) => Promise<Project>
    onStatusChanged: (callback: (app: MobileApp) => void) => () => void
    getTemplateStatus: () => Promise<TemplateStatusResponse>
    refreshTemplates: () => Promise<void>
    ensureTemplates: () => Promise<void>
    generatePRD: (request: GenerateMobilePRDRequest) => Promise<GenerateMobilePRDResponse>
    getApiKeyStatus: () => Promise<APIKeyStatusResponse>
    savePRD: (request: SavePRDRequest) => Promise<void>
    copyPRDImages: (request: CopyPRDImagesRequest) => Promise<void>
  }
  wordVomit: {
    generatePRD: (request: GenerateWordVomitPRDRequest) => Promise<GenerateWordVomitPRDResponse>
  }
  ideas: {
    getAll: () => Promise<Idea[]>
    create: (request: CreateIdeaRequest) => Promise<Idea>
    update: (request: UpdateIdeaRequest) => Promise<void>
    delete: (id: string) => Promise<void>
  }
}

/**
 * Per-terminal data routing — one global IPC listener dispatches to
 * per-terminalId subscriber sets, so N panes never means N global listeners.
 */
const dataSubscribers = new Map<string, Set<(data: string) => void>>()

ipcRenderer.on(
  'terminal:data',
  (_event: Electron.IpcRendererEvent, terminalId: string, data: string) => {
    const subs = dataSubscribers.get(terminalId)
    if (subs) {
      for (const cb of subs) cb(data)
    }
  },
)

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
    createFolder: (request: CreateProjectFolderRequest) =>
      safeInvoke(IPC_CHANNELS.CREATE_PROJECT_FOLDER, request) as Promise<string | null>,
    getAll: () => safeInvoke(IPC_CHANNELS.GET_PROJECTS) as Promise<Project[]>,
    add: (request: AddProjectRequest) =>
      safeInvoke(IPC_CHANNELS.ADD_PROJECT, request) as Promise<Project>,
    remove: (id: string) => safeInvoke(IPC_CHANNELS.REMOVE_PROJECT, id) as Promise<void>,
    setStatus: (request: SetProjectStatusRequest) =>
      safeInvoke(IPC_CHANNELS.SET_PROJECT_STATUS, request) as Promise<void>,
    onStatusChanged: (callback: (change: ProjectStatusChange) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, change: ProjectStatusChange) => {
        callback(change)
      }
      ipcRenderer.on('project:status-changed', listener)
      return () => {
        ipcRenderer.removeListener('project:status-changed', listener)
      }
    },
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
      safeInvoke(IPC_CHANNELS.TERMINAL_CREATE, request) as Promise<{ created: boolean }>,
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
    onData: (terminalId: string, callback: (data: string) => void) => {
      let subs = dataSubscribers.get(terminalId)
      if (!subs) {
        subs = new Set()
        dataSubscribers.set(terminalId, subs)
      }
      subs.add(callback)
      return () => {
        const set = dataSubscribers.get(terminalId)
        if (set) {
          set.delete(callback)
          if (set.size === 0) dataSubscribers.delete(terminalId)
        }
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
  browser: {
    navigate: (request: BrowserNavigateRequest) =>
      safeInvoke(IPC_CHANNELS.BROWSER_NAVIGATE, request) as Promise<void>,
    setProjectBrowser: (request: SetProjectBrowserRequest) =>
      safeInvoke(IPC_CHANNELS.SET_PROJECT_BROWSER, request) as Promise<void>,
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
    onStatus: (callback: (status: ClaudeStatusMap) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: ClaudeStatusMap) => {
        callback(status)
      }
      ipcRenderer.on('claude:status', listener)
      return () => {
        ipcRenderer.removeListener('claude:status', listener)
      }
    },
    onDone: (callback: (event: ClaudeDoneEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, event: ClaudeDoneEvent) => {
        callback(event)
      }
      ipcRenderer.on('claude:done', listener)
      return () => {
        ipcRenderer.removeListener('claude:done', listener)
      }
    },
  },
  settings: {
    getOpenAIKey: () => safeInvoke(IPC_CHANNELS.GET_OPENAI_KEY) as Promise<string | null>,
    setOpenAIKey: (key: string) =>
      safeInvoke(IPC_CHANNELS.SET_OPENAI_KEY, { key }) as Promise<void>,
    getClaudeKey: () => safeInvoke(IPC_CHANNELS.GET_CLAUDE_KEY) as Promise<string | null>,
    setClaudeKey: (key: string) =>
      safeInvoke(IPC_CHANNELS.SET_CLAUDE_KEY, { key }) as Promise<void>,
  },
  fileOps: {
    createFile: (request: FileCreateRequest) =>
      safeInvoke(IPC_CHANNELS.FILE_CREATE, request) as Promise<FileOpsResult>,
    readFile: (request: FileReadRequest) =>
      safeInvoke(IPC_CHANNELS.FILE_READ, request) as Promise<FileReadResponse | FileOpsResult>,
    writeFile: (request: FileWriteRequest) =>
      safeInvoke(IPC_CHANNELS.FILE_WRITE, request) as Promise<FileOpsResult>,
    listDir: (request: FileListRequest) =>
      safeInvoke(IPC_CHANNELS.FILE_LIST, request) as Promise<FileListResponse>,
  },
  tickets: {
    getAll: () => safeInvoke(IPC_CHANNELS.TICKET_GET_ALL) as Promise<Ticket[]>,
    create: (request: CreateTicketRequest) =>
      safeInvoke(IPC_CHANNELS.TICKET_CREATE, request) as Promise<Ticket>,
    update: (request: UpdateTicketRequest) =>
      safeInvoke(IPC_CHANNELS.TICKET_UPDATE, request) as Promise<void>,
    delete: (id: string) => safeInvoke(IPC_CHANNELS.TICKET_DELETE, id) as Promise<void>,
    transition: (request: TransitionTicketRequest) =>
      safeInvoke(IPC_CHANNELS.TICKET_TRANSITION, request) as Promise<void>,
    reorder: (request: ReorderTicketRequest) =>
      safeInvoke(IPC_CHANNELS.TICKET_REORDER, request) as Promise<Ticket[]>,
    openAsProject: (request: OpenTicketAsProjectRequest) =>
      safeInvoke(IPC_CHANNELS.TICKET_OPEN_AS_PROJECT, request) as Promise<Project>,
    onStatusChanged: (callback: (ticket: Ticket) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, ticket: Ticket) => {
        callback(ticket)
      }
      ipcRenderer.on('ticket:status-changed', listener)
      return () => {
        ipcRenderer.removeListener('ticket:status-changed', listener)
      }
    },
  },
  prd: {
    generate: (request: GeneratePRDRequest) =>
      safeInvoke(IPC_CHANNELS.PRD_GENERATE, request) as Promise<PRD>,
    approve: (request: ApprovePRDRequest) =>
      safeInvoke(IPC_CHANNELS.PRD_APPROVE, request) as Promise<void>,
    reject: (request: ApprovePRDRequest) =>
      safeInvoke(IPC_CHANNELS.PRD_REJECT, request) as Promise<void>,
  },
  ralph: {
    execute: (request: RalphExecuteRequest) =>
      safeInvoke(IPC_CHANNELS.RALPH_EXECUTE, request) as Promise<void>,
    getStatus: (request: RalphStatusRequest) =>
      safeInvoke(IPC_CHANNELS.RALPH_STATUS, request) as Promise<RalphStatusResponse>,
    stop: (request: RalphStopRequest) =>
      safeInvoke(IPC_CHANNELS.RALPH_STOP, request) as Promise<void>,
    chooseWorktreeDir: () =>
      safeInvoke(IPC_CHANNELS.RALPH_CHOOSE_WORKTREE_DIR) as Promise<string | null>,
    onStatusChanged: (
      callback: (data: { ticketId: string; running: boolean; iteration: number }) => void,
    ) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { ticketId: string; running: boolean; iteration: number },
      ) => {
        callback(data)
      }
      ipcRenderer.on('ralph:status-changed', listener)
      return () => {
        ipcRenderer.removeListener('ralph:status-changed', listener)
      }
    },
  },
  expo: {
    getAll: () => safeInvoke(IPC_CHANNELS.EXPO_GET_ALL) as Promise<MobileApp[]>,
    create: (request: CreateMobileAppRequest) =>
      safeInvoke(IPC_CHANNELS.EXPO_CREATE, request) as Promise<MobileApp>,
    add: (request: AddMobileAppRequest) =>
      safeInvoke(IPC_CHANNELS.EXPO_ADD, request) as Promise<MobileApp>,
    remove: (id: string) => safeInvoke(IPC_CHANNELS.EXPO_REMOVE, id) as Promise<void>,
    start: (request: StartExpoRequest) =>
      safeInvoke(IPC_CHANNELS.EXPO_START, request) as Promise<void>,
    stop: (request: StopExpoRequest) =>
      safeInvoke(IPC_CHANNELS.EXPO_STOP, request) as Promise<void>,
    getStatus: (request: ExpoStatusRequest) =>
      safeInvoke(IPC_CHANNELS.EXPO_STATUS, request) as Promise<ExpoStatusResponse>,
    openFolderDialog: () =>
      safeInvoke(IPC_CHANNELS.EXPO_OPEN_FOLDER_DIALOG) as Promise<string | null>,
    chooseParentDir: () =>
      safeInvoke(IPC_CHANNELS.EXPO_CHOOSE_PARENT_DIR) as Promise<string | null>,
    openAsProject: (request: OpenMobileAppAsProjectRequest) =>
      safeInvoke(IPC_CHANNELS.EXPO_OPEN_AS_PROJECT, request) as Promise<Project>,
    onStatusChanged: (callback: (app: MobileApp) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, app: MobileApp) => {
        callback(app)
      }
      ipcRenderer.on('expo:status-changed', listener)
      return () => {
        ipcRenderer.removeListener('expo:status-changed', listener)
      }
    },
    getTemplateStatus: () =>
      safeInvoke(IPC_CHANNELS.EXPO_TEMPLATE_STATUS) as Promise<TemplateStatusResponse>,
    refreshTemplates: () => safeInvoke(IPC_CHANNELS.EXPO_REFRESH_TEMPLATES) as Promise<void>,
    ensureTemplates: () => safeInvoke(IPC_CHANNELS.EXPO_ENSURE_TEMPLATES) as Promise<void>,
    generatePRD: (request: GenerateMobilePRDRequest) =>
      safeInvoke(IPC_CHANNELS.EXPO_GENERATE_PRD, request) as Promise<GenerateMobilePRDResponse>,
    getApiKeyStatus: () =>
      safeInvoke(IPC_CHANNELS.EXPO_API_KEY_STATUS) as Promise<APIKeyStatusResponse>,
    savePRD: (request: SavePRDRequest) =>
      safeInvoke(IPC_CHANNELS.EXPO_SAVE_PRD, request) as Promise<void>,
    copyPRDImages: (request: CopyPRDImagesRequest) =>
      safeInvoke(IPC_CHANNELS.EXPO_COPY_PRD_IMAGES, request) as Promise<void>,
  },
  wordVomit: {
    generatePRD: (request: GenerateWordVomitPRDRequest) =>
      safeInvoke(
        IPC_CHANNELS.WORD_VOMIT_GENERATE_PRD,
        request,
      ) as Promise<GenerateWordVomitPRDResponse>,
  },
  ideas: {
    getAll: () => safeInvoke(IPC_CHANNELS.IDEA_GET_ALL) as Promise<Idea[]>,
    create: (request: CreateIdeaRequest) =>
      safeInvoke(IPC_CHANNELS.IDEA_CREATE, request) as Promise<Idea>,
    update: (request: UpdateIdeaRequest) =>
      safeInvoke(IPC_CHANNELS.IDEA_UPDATE, request) as Promise<void>,
    delete: (id: string) => safeInvoke(IPC_CHANNELS.IDEA_DELETE, id) as Promise<void>,
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
