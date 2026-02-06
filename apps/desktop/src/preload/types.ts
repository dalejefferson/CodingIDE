/**
 * Preload API Type Definitions
 *
 * The ElectronAPI interface and Window augmentation — the typed surface
 * exposed to the renderer via contextBridge.
 */

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
  PortCheckRequest,
  PortCheckResponse,
  PortFindAvailableRequest,
  PortFindAvailableResponse,
  PortRegisterRequest,
  PortUnregisterRequest,
  PortGetOwnerRequest,
  PortGetOwnerResponse,
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
    deleteByProjectId: (projectId: string) => Promise<number>
  }
  ports: {
    check: (request: PortCheckRequest) => Promise<PortCheckResponse>
    findAvailable: (request: PortFindAvailableRequest) => Promise<PortFindAvailableResponse>
    register: (request: PortRegisterRequest) => Promise<void>
    unregister: (request: PortUnregisterRequest) => Promise<void>
    getOwner: (request: PortGetOwnerRequest) => Promise<PortGetOwnerResponse>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
