export interface AppInfo {
  name: string
  version: string
  platform: NodeJS.Platform
  arch: string
}

export interface WindowState {
  isMaximized: boolean
  isMinimized: boolean
  isFocused: boolean
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  context?: Record<string, unknown>
}

// ── Theming ──────────────────────────────────────────────────

/** Available theme identifiers. Cycle order: light → dark → light. */
export type ThemeId = 'light' | 'dark'

export const THEME_IDS: readonly ThemeId[] = ['light', 'dark'] as const

// ── Browser View Modes ─────────────────────────────────────

export type BrowserViewMode = 'closed' | 'split' | 'focused' | 'fullscreen' | 'pip'

export const BROWSER_VIEW_MODES: readonly BrowserViewMode[] = [
  'closed',
  'split',
  'focused',
  'fullscreen',
  'pip',
] as const

// ── Project Management ───────────────────────────────────────

export type ProjectStatus = 'idle' | 'running' | 'done' | 'needs_input'

export type ProjectType = 'standard' | 'mobile'

export interface Project {
  id: string
  name: string
  path: string
  status: ProjectStatus
  addedAt: number
  /** Optional per-project theme override. When set, overrides the global theme. */
  theme?: ThemeId
  /** Last browser URL for this project. Restored when switching back. */
  browserUrl?: string
  /** Last browser view mode for this project. Restored when switching back. */
  browserViewMode?: BrowserViewMode
  /** Origin tracker — set to 'ralph-loop' when created via Ralph Loop. */
  origin?: 'ralph-loop'
  /** Linked ticket ID when origin is 'ralph-loop'. */
  ticketId?: string
  /** Project type: 'standard' (default) or 'mobile' for Expo apps */
  type?: ProjectType
  /** Linked mobile app ID when type is 'mobile' */
  mobileAppId?: string
}

export interface AddProjectRequest {
  path: string
}

/** Request to create a new project folder inside a user-chosen parent directory. */
export interface CreateProjectFolderRequest {
  name: string
}

/**
 * Request to set (or clear) a project's theme override.
 * Pass `theme: null` to remove the override and fall back to global theme.
 */
export interface SetProjectThemeRequest {
  id: string
  theme: ThemeId | null
}

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'idle',
  'running',
  'done',
  'needs_input',
] as const

/** Request to update a project's status from the main process. */
export interface SetProjectStatusRequest {
  id: string
  status: ProjectStatus
}

/** Broadcast payload when a project's status changes. */
export interface ProjectStatusChange {
  id: string
  status: ProjectStatus
}

// ── Terminal ─────────────────────────────────────────────────

export interface TerminalCreateRequest {
  projectId: string
  terminalId: string
  cwd: string
  cols?: number
  rows?: number
}

export interface TerminalWriteRequest {
  terminalId: string
  data: string
}

export interface TerminalResizeRequest {
  terminalId: string
  cols: number
  rows: number
}

export interface TerminalKillRequest {
  terminalId: string
}

export interface TerminalLayoutRequest {
  projectId: string
}

export interface TerminalSetLayoutRequest {
  projectId: string
  layout: unknown
}

// ── Terminal Command Completion ──────────────────────────────

/**
 * Emitted when a terminal command completes (best-effort detection).
 *
 * Detection method: shell prompt heuristics. The service tracks a "busy"
 * flag per terminal (set when user writes a newline, cleared when a
 * shell prompt pattern is detected in PTY output). When the flag
 * transitions from busy→idle, a completion event fires.
 *
 * Known limitations:
 *   - Prompt detection relies on common patterns ($ % > #); custom PS1
 *     values with no trailing marker may be missed.
 *   - Multi-line commands or commands that print a prompt-like string
 *     in their output may trigger false positives.
 *   - Very fast commands (<100 ms) are debounced to avoid noise.
 */
export interface CommandCompletionEvent {
  terminalId: string
  projectId: string
  /** Approximate wall-clock duration in milliseconds */
  elapsedMs: number
}

// ── Claude Activity ─────────────────────────────────────────

/** Per-project Claude activity counts broadcast from the main process. */
export interface ClaudeActivityMap {
  /** projectId → number of active Claude processes */
  [projectId: string]: number
}

/** Whether Claude is actively generating output or waiting for user input. */
export type ClaudeStatus = 'generating' | 'waiting'

/** Per-project Claude status: generating (output flowing) or waiting (idle, needs input). */
export interface ClaudeStatusMap {
  [projectId: string]: ClaudeStatus
}

/** Emitted when Claude finishes generating in a project (activity transitions >0 → 0). */
export interface ClaudeDoneEvent {
  projectId: string
}

// ── Command Presets ─────────────────────────────────────────

export interface CommandPreset {
  id: string
  name: string
  command: string
}

export interface SetPresetsRequest {
  presets: CommandPreset[]
}

// ── Native Notifications ────────────────────────────────────

export interface NativeNotifyRequest {
  title: string
  body?: string
}

// ── Browser / Element Picker ────────────────────────────────

/** Payload produced by the element picker when user clicks an element in the browser pane. */
export interface ElementPickerPayload {
  /** CSS selector that uniquely targets the element */
  selector: string
  /** Trimmed innerText (max 200 chars) */
  innerText: string
  /** HTML tag name (lowercase) */
  tag: string
  /** Element id attribute, or null */
  id: string | null
  /** List of CSS class names */
  classes: string[]
  /** Key attributes (href, src, type, role, aria-label, data-testid) */
  attributes: Record<string, string>
}

/** Request to navigate the embedded browser to a URL. */
export interface BrowserNavigateRequest {
  url: string
}

/** Request to persist a project's browser state (URL and/or view mode). */
export interface SetProjectBrowserRequest {
  id: string
  browserUrl?: string | null
  browserViewMode?: BrowserViewMode | null
}

// ── Git ─────────────────────────────────────────────────────

export interface GitBranchRequest {
  cwd: string
}

export interface GitBranchResponse {
  branch: string | null
}

// ── Kanban / Ralph Loop ─────────────────────────────────────

export type TicketStatus =
  | 'backlog'
  | 'up_next'
  | 'in_review'
  | 'in_progress'
  | 'in_testing'
  | 'completed'

export const TICKET_STATUSES: readonly TicketStatus[] = [
  'backlog',
  'up_next',
  'in_review',
  'in_progress',
  'in_testing',
  'completed',
] as const

export const VALID_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  backlog: ['up_next'],
  up_next: ['in_review', 'backlog'],
  in_review: ['in_progress', 'backlog'],
  in_progress: ['in_testing'],
  in_testing: ['completed', 'in_progress'],
  completed: [],
} as const

export type TicketType = 'feature' | 'bug' | 'chore' | 'spike'

export const TICKET_TYPES: readonly TicketType[] = ['feature', 'bug', 'chore', 'spike'] as const

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'

export const TICKET_PRIORITIES: readonly TicketPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
] as const

export interface PRD {
  content: string
  generatedAt: number
  approved: boolean
}

export interface HistoryEvent {
  timestamp: number
  action: string
  from?: string
  to?: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  acceptanceCriteria: string[]
  status: TicketStatus
  type: TicketType
  priority: TicketPriority
  projectId: string | null
  prd: PRD | null
  history: HistoryEvent[]
  worktreeBasePath: string | null
  worktreePath: string | null
  createdAt: number
  updatedAt: number
  order: number
}

// ── Ticket IPC Request/Response Types ───────────────────────

export interface CreateTicketRequest {
  title: string
  description: string
  acceptanceCriteria: string[]
  type: TicketType
  priority: TicketPriority
  projectId: string | null
  prd?: PRD
}

export interface UpdateTicketRequest {
  id: string
  title?: string
  description?: string
  acceptanceCriteria?: string[]
  type?: TicketType
  priority?: TicketPriority
  projectId?: string | null
}

export interface TransitionTicketRequest {
  id: string
  status: TicketStatus
}

export interface ReorderTicketRequest {
  id: string
  status: TicketStatus
  index: number
}

export interface GeneratePRDRequest {
  ticketId: string
}

export interface ApprovePRDRequest {
  ticketId: string
}

export interface RalphExecuteRequest {
  ticketId: string
  worktreeBasePath?: string
}

export interface RalphStatusRequest {
  ticketId: string
}

export interface RalphStatusResponse {
  running: boolean
  iteration: number
  log: string
}

export interface RalphStopRequest {
  ticketId: string
}

export interface OpenTicketAsProjectRequest {
  ticketId: string
}

// ── File Operations ─────────────────────────────────────────

/** Maximum file content payload size in bytes (2 MB) */
export const FILE_OPS_MAX_SIZE = 2 * 1024 * 1024

/** Mode for write operations */
export type FileWriteMode = 'overwrite' | 'createOnly'

export const FILE_WRITE_MODES: readonly FileWriteMode[] = ['overwrite', 'createOnly'] as const

/** Request to create a file in a project */
export interface FileCreateRequest {
  projectId: string
  relPath: string
  contents?: string
  mkdirp?: boolean
}

/** Request to read a file from a project */
export interface FileReadRequest {
  projectId: string
  relPath: string
}

/** Response from reading a file */
export interface FileReadResponse {
  contents: string
  size: number
}

/** Request to write/update a file in a project */
export interface FileWriteRequest {
  projectId: string
  relPath: string
  contents: string
  mode: FileWriteMode
}

export interface FileListRequest {
  projectId: string
  dirPath: string // relative path from project root, '' for root
}

export interface FileEntry {
  name: string
  isDir: boolean
  size: number
}

export type FileListResponse = FileEntry[]

/** Structured error from file operations */
export interface FileOpsError {
  code:
    | 'PATH_TRAVERSAL'
    | 'FILE_EXISTS'
    | 'FILE_NOT_FOUND'
    | 'TOO_LARGE'
    | 'PERMISSION_DENIED'
    | 'UNKNOWN'
  message: string
}

/** Result wrapper for file operations */
export interface FileOpsResult {
  ok: boolean
  error?: FileOpsError
}

// ── App Builder / Expo ──────────────────────────────────────

export type ExpoTemplate = 'blank' | 'tabs' | 'drawer'
export const EXPO_TEMPLATES: readonly ExpoTemplate[] = ['blank', 'tabs', 'drawer'] as const

export type MobileAppStatus = 'idle' | 'starting' | 'running' | 'error' | 'stopped'
export const MOBILE_APP_STATUSES: readonly MobileAppStatus[] = [
  'idle',
  'starting',
  'running',
  'error',
  'stopped',
] as const

export interface MobileApp {
  id: string
  name: string
  path: string
  template: ExpoTemplate
  status: MobileAppStatus
  expoUrl: string | null
  /** Web preview URL for the IDE's iPhone frame (http://localhost:XXXX) */
  webUrl: string | null
  metroPort: number
  addedAt: number
  lastError: string | null
  /** Whether this app has a .prd/ folder with PRD content */
  hasPRD?: boolean
  /** Linked project tab ID when opened as a mobile workspace tab */
  projectId: string | null
}

export interface CreateMobileAppRequest {
  name: string
  template: ExpoTemplate
  parentDir: string
  /** Optional PRD content to save to .prd/prd.md */
  prdContent?: string
  /** Optional palette ID from mobilePalettes */
  paletteId?: string
  /** Optional reference image paths to copy into .prd/images/ */
  imagePaths?: string[]
}

export interface AddMobileAppRequest {
  path: string
}

export interface StartExpoRequest {
  appId: string
}

export interface StopExpoRequest {
  appId: string
}

export interface ExpoStatusRequest {
  appId: string
}

export interface ExpoStatusResponse {
  status: MobileAppStatus
  expoUrl: string | null
  /** Web preview URL for the IDE's iPhone frame */
  webUrl: string | null
  log: string
  lastError: string | null
}

export interface OpenMobileAppAsProjectRequest {
  appId: string
}

// ── Template Cache ──────────────────────────────────────────

export interface TemplateStatus {
  template: ExpoTemplate
  ready: boolean
  extractedAt: number | null
}

export interface TemplateStatusResponse {
  templates: TemplateStatus[]
  allReady: boolean
}

// ── Mobile PRD ──────────────────────────────────────────────

export interface MobileAppPRDConfig {
  prdContent: string
  paletteId: string | null
  imagePaths: string[]
}

export interface GenerateMobilePRDRequest {
  appDescription: string
  template: ExpoTemplate
  paletteId?: string
}

export interface GenerateMobilePRDResponse {
  content: string
}

export interface SavePRDRequest {
  appPath: string
  prdContent: string
  paletteId: string | null
}

export interface CopyPRDImagesRequest {
  appPath: string
  imagePaths: string[]
}

export interface APIKeyStatusResponse {
  hasOpenAI: boolean
  hasClaude: boolean
  hasAny: boolean
}

// ── Word Vomit PRD ──────────────────────────────────────────

export interface GenerateWordVomitPRDRequest {
  rawIdea: string
}

export interface GenerateWordVomitPRDResponse {
  content: string
}

// ── Mobile App Palette ──────────────────────────────────────

export interface MobileAppPalette {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
  }
}

// ── iPhone Device Presets ───────────────────────────────────

export interface IPhoneDevice {
  id: string
  name: string
  width: number
  height: number
}

export const IPHONE_DEVICES: readonly IPhoneDevice[] = [
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667 },
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844 },
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', width: 393, height: 852 },
  { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', width: 430, height: 932 },
  { id: 'iphone-16', name: 'iPhone 16', width: 393, height: 852 },
  { id: 'ipad-mini', name: 'iPad Mini', width: 744, height: 1133 },
] as const

// ── Idea Log ────────────────────────────────────────────────

export type IdeaPriority = 'low' | 'medium' | 'high'

export const IDEA_PRIORITIES: readonly IdeaPriority[] = ['low', 'medium', 'high'] as const

export interface Idea {
  id: string
  title: string
  description: string
  projectId: string | null
  priority: IdeaPriority | null
  createdAt: number
  updatedAt: number
  order: number
}

export interface CreateIdeaRequest {
  title: string
  description: string
  projectId: string | null
  priority: IdeaPriority | null
}

export interface UpdateIdeaRequest {
  id: string
  title?: string
  description?: string
  projectId?: string | null
  priority?: IdeaPriority | null
}
