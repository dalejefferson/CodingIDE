import type { ThemeId, BrowserViewMode } from './core'

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
