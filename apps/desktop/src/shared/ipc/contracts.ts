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
  TerminalCreateRequest,
  TerminalWriteRequest,
  TerminalResizeRequest,
  TerminalKillRequest,
  TerminalLayoutRequest,
  TerminalSetLayoutRequest,
  NativeNotifyRequest,
  CommandPreset,
  SetPresetsRequest,
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
} from '../types'
import { IPC_CHANNELS } from './channels'

// ── Type Contracts ─────────────────────────────────────────────

export interface IPCContracts {
  [IPC_CHANNELS.PING]: {
    request: void
    response: string
  }
  [IPC_CHANNELS.GET_APP_VERSION]: {
    request: void
    response: string
  }
  [IPC_CHANNELS.WINDOW_MINIMIZE]: {
    request: void
    response: void
  }
  [IPC_CHANNELS.WINDOW_MAXIMIZE]: {
    request: void
    response: void
  }
  [IPC_CHANNELS.WINDOW_CLOSE]: {
    request: void
    response: void
  }
  [IPC_CHANNELS.OPEN_FOLDER_DIALOG]: {
    request: void
    response: string | null
  }
  [IPC_CHANNELS.GET_PROJECTS]: {
    request: void
    response: Project[]
  }
  [IPC_CHANNELS.ADD_PROJECT]: {
    request: AddProjectRequest
    response: Project
  }
  [IPC_CHANNELS.CREATE_PROJECT_FOLDER]: {
    request: CreateProjectFolderRequest
    response: string | null
  }
  [IPC_CHANNELS.REMOVE_PROJECT]: {
    request: string
    response: void
  }
  [IPC_CHANNELS.GET_GLOBAL_THEME]: {
    request: void
    response: ThemeId
  }
  [IPC_CHANNELS.SET_GLOBAL_THEME]: {
    request: ThemeId
    response: void
  }
  [IPC_CHANNELS.SET_PROJECT_THEME]: {
    request: SetProjectThemeRequest
    response: void
  }
  [IPC_CHANNELS.TERMINAL_CREATE]: {
    request: TerminalCreateRequest
    response: { created: boolean }
  }
  [IPC_CHANNELS.TERMINAL_WRITE]: {
    request: TerminalWriteRequest
    response: void
  }
  [IPC_CHANNELS.TERMINAL_RESIZE]: {
    request: TerminalResizeRequest
    response: void
  }
  [IPC_CHANNELS.TERMINAL_KILL]: {
    request: TerminalKillRequest
    response: void
  }
  [IPC_CHANNELS.TERMINAL_KILL_ALL]: {
    request: string
    response: void
  }
  [IPC_CHANNELS.TERMINAL_GET_BUFFER]: {
    request: TerminalKillRequest
    response: string
  }
  [IPC_CHANNELS.TERMINAL_GET_LAYOUT]: {
    request: TerminalLayoutRequest
    response: unknown | null
  }
  [IPC_CHANNELS.TERMINAL_SET_LAYOUT]: {
    request: TerminalSetLayoutRequest
    response: void
  }
  [IPC_CHANNELS.GIT_BRANCH]: {
    request: GitBranchRequest
    response: GitBranchResponse
  }
  [IPC_CHANNELS.NATIVE_NOTIFY]: {
    request: NativeNotifyRequest
    response: void
  }
  [IPC_CHANNELS.OPEN_EXTERNAL_URL]: {
    request: string
    response: void
  }
  [IPC_CHANNELS.GET_PRESETS]: {
    request: void
    response: CommandPreset[]
  }
  [IPC_CHANNELS.SET_PRESETS]: {
    request: SetPresetsRequest
    response: void
  }
  [IPC_CHANNELS.SET_PROJECT_STATUS]: {
    request: SetProjectStatusRequest
    response: void
  }
  [IPC_CHANNELS.BROWSER_NAVIGATE]: {
    request: BrowserNavigateRequest
    response: void
  }
  [IPC_CHANNELS.SET_PROJECT_BROWSER]: {
    request: SetProjectBrowserRequest
    response: void
  }
  // ── Kanban / Ralph Loop ──────────────────────────────────
  [IPC_CHANNELS.TICKET_GET_ALL]: {
    request: void
    response: Ticket[]
  }
  [IPC_CHANNELS.TICKET_CREATE]: {
    request: CreateTicketRequest
    response: Ticket
  }
  [IPC_CHANNELS.TICKET_UPDATE]: {
    request: UpdateTicketRequest
    response: void
  }
  [IPC_CHANNELS.TICKET_DELETE]: {
    request: string
    response: void
  }
  [IPC_CHANNELS.TICKET_TRANSITION]: {
    request: TransitionTicketRequest
    response: void
  }
  [IPC_CHANNELS.TICKET_REORDER]: {
    request: ReorderTicketRequest
    response: Ticket[]
  }
  [IPC_CHANNELS.PRD_GENERATE]: {
    request: GeneratePRDRequest
    response: PRD
  }
  [IPC_CHANNELS.PRD_APPROVE]: {
    request: ApprovePRDRequest
    response: void
  }
  [IPC_CHANNELS.PRD_REJECT]: {
    request: ApprovePRDRequest
    response: void
  }
  [IPC_CHANNELS.RALPH_EXECUTE]: {
    request: RalphExecuteRequest
    response: void
  }
  [IPC_CHANNELS.RALPH_STATUS]: {
    request: RalphStatusRequest
    response: RalphStatusResponse
  }
  [IPC_CHANNELS.RALPH_STOP]: {
    request: RalphStopRequest
    response: void
  }
  [IPC_CHANNELS.RALPH_CHOOSE_WORKTREE_DIR]: {
    request: void
    response: string | null
  }
  [IPC_CHANNELS.TICKET_OPEN_AS_PROJECT]: {
    request: OpenTicketAsProjectRequest
    response: Project
  }
  // ── Settings ───────────────────────────────────────────────
  [IPC_CHANNELS.GET_OPENAI_KEY]: {
    request: void
    response: string | null
  }
  [IPC_CHANNELS.SET_OPENAI_KEY]: {
    request: { key: string }
    response: void
  }
  [IPC_CHANNELS.GET_CLAUDE_KEY]: {
    request: void
    response: string | null
  }
  [IPC_CHANNELS.SET_CLAUDE_KEY]: {
    request: { key: string }
    response: void
  }
  // ── File Operations ──────────────────────────────────────────
  [IPC_CHANNELS.FILE_CREATE]: {
    request: FileCreateRequest
    response: FileOpsResult
  }
  [IPC_CHANNELS.FILE_READ]: {
    request: FileReadRequest
    response: FileReadResponse
  }
  [IPC_CHANNELS.FILE_WRITE]: {
    request: FileWriteRequest
    response: FileOpsResult
  }
  [IPC_CHANNELS.FILE_LIST]: {
    request: FileListRequest
    response: FileListResponse
  }
  // ── App Builder / Expo ────────────────────────────────────
  [IPC_CHANNELS.EXPO_GET_ALL]: {
    request: void
    response: MobileApp[]
  }
  [IPC_CHANNELS.EXPO_CREATE]: {
    request: CreateMobileAppRequest
    response: MobileApp
  }
  [IPC_CHANNELS.EXPO_ADD]: {
    request: AddMobileAppRequest
    response: MobileApp
  }
  [IPC_CHANNELS.EXPO_REMOVE]: {
    request: string
    response: void
  }
  [IPC_CHANNELS.EXPO_START]: {
    request: StartExpoRequest
    response: void
  }
  [IPC_CHANNELS.EXPO_STOP]: {
    request: StopExpoRequest
    response: void
  }
  [IPC_CHANNELS.EXPO_STATUS]: {
    request: ExpoStatusRequest
    response: ExpoStatusResponse
  }
  [IPC_CHANNELS.EXPO_OPEN_FOLDER_DIALOG]: {
    request: void
    response: string | null
  }
  [IPC_CHANNELS.EXPO_CHOOSE_PARENT_DIR]: {
    request: void
    response: string | null
  }
  [IPC_CHANNELS.EXPO_OPEN_AS_PROJECT]: {
    request: OpenMobileAppAsProjectRequest
    response: Project
  }
  // ── App Builder Enhancement ─────────────────────────────
  [IPC_CHANNELS.EXPO_TEMPLATE_STATUS]: {
    request: void
    response: TemplateStatusResponse
  }
  [IPC_CHANNELS.EXPO_REFRESH_TEMPLATES]: {
    request: void
    response: void
  }
  [IPC_CHANNELS.EXPO_ENSURE_TEMPLATES]: {
    request: void
    response: void
  }
  [IPC_CHANNELS.EXPO_GENERATE_PRD]: {
    request: GenerateMobilePRDRequest
    response: GenerateMobilePRDResponse
  }
  [IPC_CHANNELS.EXPO_API_KEY_STATUS]: {
    request: void
    response: APIKeyStatusResponse
  }
  [IPC_CHANNELS.EXPO_SAVE_PRD]: {
    request: SavePRDRequest
    response: void
  }
  [IPC_CHANNELS.EXPO_COPY_PRD_IMAGES]: {
    request: CopyPRDImagesRequest
    response: void
  }
  // ── Word Vomit ────────────────────────────────────────────
  [IPC_CHANNELS.WORD_VOMIT_GENERATE_PRD]: {
    request: GenerateWordVomitPRDRequest
    response: GenerateWordVomitPRDResponse
  }
  // ── Idea Log ──────────────────────────────────────────────
  [IPC_CHANNELS.IDEA_GET_ALL]: {
    request: void
    response: Idea[]
  }
  [IPC_CHANNELS.IDEA_CREATE]: {
    request: CreateIdeaRequest
    response: Idea
  }
  [IPC_CHANNELS.IDEA_UPDATE]: {
    request: UpdateIdeaRequest
    response: void
  }
  [IPC_CHANNELS.IDEA_DELETE]: {
    request: string
    response: void
  }
  [IPC_CHANNELS.IDEA_DELETE_BY_PROJECT]: {
    request: string
    response: number
  }
  // ── Port Service ────────────────────────────────────────────
  [IPC_CHANNELS.PORT_CHECK]: {
    request: PortCheckRequest
    response: PortCheckResponse
  }
  [IPC_CHANNELS.PORT_FIND_AVAILABLE]: {
    request: PortFindAvailableRequest
    response: PortFindAvailableResponse
  }
  [IPC_CHANNELS.PORT_REGISTER]: {
    request: PortRegisterRequest
    response: void
  }
  [IPC_CHANNELS.PORT_UNREGISTER]: {
    request: PortUnregisterRequest
    response: void
  }
  [IPC_CHANNELS.PORT_GET_OWNER]: {
    request: PortGetOwnerRequest
    response: PortGetOwnerResponse
  }
}
