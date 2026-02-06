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
