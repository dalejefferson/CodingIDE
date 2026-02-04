import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { dirname, basename, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  Project,
  AddProjectRequest,
  ThemeId,
  ProjectStatus,
  BrowserViewMode,
} from '@shared/types'

/**
 * JSON file-based project store.
 *
 * Why JSON over SQLite:
 *   - Zero native dependencies — avoids build complexity in Electron.
 *   - Project metadata is small (name, path, status) and read/written infrequently.
 *   - Atomic writes (write-to-temp + rename) prevent data loss on crash.
 *   - Easy to upgrade to SQLite later when complex queries are warranted.
 *
 * Constructor accepts a custom file path for testability.
 */
export class ProjectStore {
  private filePath: string
  private projects: Project[] | null = null

  private dirty = false
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly DEBOUNCE_MS = 500

  constructor(filePath: string) {
    this.filePath = filePath
  }

  /** Mark store as needing a write — actual disk write is debounced. */
  private markDirty(): void {
    this.dirty = true
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        this.flush()
      }, this.DEBOUNCE_MS)
    }
  }

  /** Flush pending writes to disk immediately. Call on app quit. */
  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (!this.dirty) return
    this.dirty = false
    this.persist()
  }

  /** Lazy-load from disk on first access */
  private load(): Project[] {
    if (this.projects !== null) return this.projects

    if (!existsSync(this.filePath)) {
      this.projects = []
      return this.projects
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        this.projects = []
        return this.projects
      }
      this.projects = parsed as Project[]
    } catch {
      this.projects = []
    }

    return this.projects
  }

  /** Atomic write: write to temp file, then rename over the real file */
  private persist(): void {
    const projects = this.load()
    const dir = dirname(this.filePath)
    mkdirSync(dir, { recursive: true })

    const tmp = join(dir, `.projects-${Date.now()}.tmp`)
    writeFileSync(tmp, JSON.stringify(projects, null, 2), 'utf-8')
    renameSync(tmp, this.filePath)
  }

  getAll(): Project[] {
    return [...this.load()]
  }

  getById(id: string): Project | undefined {
    return this.load().find((p) => p.id === id)
  }

  /** Add a project. Deduplicates by path — returns existing project if path already added. */
  add(request: AddProjectRequest): Project {
    const projects = this.load()
    const existing = projects.find((p) => p.path === request.path)
    if (existing) return existing

    const project: Project = {
      id: randomUUID(),
      name: basename(request.path),
      path: request.path,
      status: 'idle',
      addedAt: Date.now(),
    }

    projects.push(project)
    this.markDirty()
    return project
  }

  /** Remove by id. Returns true if found and removed, false if not found. */
  remove(id: string): boolean {
    const projects = this.load()
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) return false

    projects.splice(idx, 1)
    this.markDirty()
    return true
  }

  /**
   * Set or clear a project's theme override.
   * Pass `null` to remove the override (fall back to global theme).
   */
  setTheme(id: string, theme: ThemeId | null): boolean {
    const projects = this.load()
    const project = projects.find((p) => p.id === id)
    if (!project) return false

    if (theme === null) {
      delete project.theme
    } else {
      project.theme = theme
    }

    this.markDirty()
    return true
  }

  /** Update a project's status. Returns true if found and updated. */
  setStatus(id: string, status: ProjectStatus): boolean {
    const projects = this.load()
    const project = projects.find((p) => p.id === id)
    if (!project) return false

    if (project.status === status) return true
    project.status = status
    this.markDirty()
    return true
  }

  /**
   * Update a project's browser state (URL and/or view mode).
   * Pass `null` for a field to clear it. Pass `undefined` to leave it unchanged.
   */
  setBrowser(
    id: string,
    browserUrl?: string | null,
    browserViewMode?: BrowserViewMode | null,
  ): boolean {
    const projects = this.load()
    const project = projects.find((p) => p.id === id)
    if (!project) return false

    if (browserUrl !== undefined) {
      if (browserUrl === null) {
        delete project.browserUrl
      } else {
        project.browserUrl = browserUrl
      }
    }

    if (browserViewMode !== undefined) {
      if (browserViewMode === null) {
        delete project.browserViewMode
      } else {
        project.browserViewMode = browserViewMode
      }
    }

    this.markDirty()
    return true
  }

  /** Force reload from disk (useful after external changes) */
  reload(): void {
    this.projects = null
  }
}
