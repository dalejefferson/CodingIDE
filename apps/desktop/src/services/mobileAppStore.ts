import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  MobileApp,
  MobileAppStatus,
  CreateMobileAppRequest,
  AddMobileAppRequest,
} from '@shared/types'

/**
 * JSON file-based mobile app store.
 *
 * Follows the same pattern as TicketStore / ProjectStore:
 *   - Lazy-load on first access
 *   - Debounced atomic writes (write-to-temp + rename)
 *   - Constructor accepts custom path for testability
 */
export class MobileAppStore {
  private filePath: string
  private apps: MobileApp[] | null = null
  private dirty = false
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly DEBOUNCE_MS = 500

  constructor(filePath: string) {
    this.filePath = filePath
  }

  private markDirty(): void {
    this.dirty = true
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        this.flush()
      }, this.DEBOUNCE_MS)
    }
  }

  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (!this.dirty) return
    this.dirty = false
    this.persist()
  }

  private load(): MobileApp[] {
    if (this.apps !== null) return this.apps

    if (!existsSync(this.filePath)) {
      this.apps = []
      return this.apps
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        this.apps = []
        return this.apps
      }
      this.apps = parsed as MobileApp[]
    } catch {
      this.apps = []
    }

    return this.apps
  }

  private persist(): void {
    const apps = this.load()
    const dir = dirname(this.filePath)
    mkdirSync(dir, { recursive: true })

    const tmp = join(dir, `.mobile-apps-${Date.now()}.tmp`)
    writeFileSync(tmp, JSON.stringify(apps, null, 2), 'utf-8')
    renameSync(tmp, this.filePath)
  }

  getAll(): MobileApp[] {
    return [...this.load()]
  }

  getById(id: string): MobileApp | undefined {
    return this.load().find((a) => a.id === id)
  }

  create(payload: CreateMobileAppRequest, projectPath: string): MobileApp {
    const apps = this.load()

    const app: MobileApp = {
      id: randomUUID(),
      name: payload.name,
      path: projectPath,
      template: payload.template,
      status: 'idle',
      expoUrl: null,
      webUrl: null,
      metroPort: 8081,
      addedAt: Date.now(),
      lastError: null,
      projectId: null,
    }

    apps.push(app)
    this.markDirty()
    return app
  }

  add(payload: AddMobileAppRequest): MobileApp {
    const apps = this.load()

    // Deduplicate by path
    const existing = apps.find((a) => a.path === payload.path)
    if (existing) return existing

    const app: MobileApp = {
      id: randomUUID(),
      name: payload.path.split('/').pop() || 'Untitled',
      path: payload.path,
      template: 'blank',
      status: 'idle',
      expoUrl: null,
      webUrl: null,
      metroPort: 8081,
      addedAt: Date.now(),
      lastError: null,
      projectId: null,
    }

    apps.push(app)
    this.markDirty()
    return app
  }

  remove(id: string): void {
    const apps = this.load()
    const idx = apps.findIndex((a) => a.id === id)
    if (idx !== -1) {
      apps.splice(idx, 1)
      this.markDirty()
    }
  }

  setStatus(id: string, status: MobileAppStatus): void {
    const apps = this.load()
    const app = apps.find((a) => a.id === id)
    if (app) {
      app.status = status
      this.markDirty()
    }
  }

  setExpoUrl(id: string, url: string | null): void {
    const apps = this.load()
    const app = apps.find((a) => a.id === id)
    if (app) {
      app.expoUrl = url
      this.markDirty()
    }
  }

  setError(id: string, error: string | null): void {
    const apps = this.load()
    const app = apps.find((a) => a.id === id)
    if (app) {
      app.lastError = error
      this.markDirty()
    }
  }

  setWebUrl(id: string, url: string | null): void {
    const apps = this.load()
    const app = apps.find((a) => a.id === id)
    if (app) {
      app.webUrl = url
      this.markDirty()
    }
  }

  setProjectId(id: string, projectId: string | null): void {
    const apps = this.load()
    const app = apps.find((a) => a.id === id)
    if (app) {
      app.projectId = projectId
      this.markDirty()
    }
  }
}
