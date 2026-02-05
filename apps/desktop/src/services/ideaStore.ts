import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Idea, CreateIdeaRequest, UpdateIdeaRequest } from '@shared/types'

/**
 * JSON file-based idea store.
 *
 * Follows the same pattern as TicketStore:
 *   - Lazy-load on first access
 *   - Debounced atomic writes (write-to-temp + rename)
 *   - Constructor accepts custom path for testability
 */
export class IdeaStore {
  private filePath: string
  private ideas: Idea[] | null = null
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

  private load(): Idea[] {
    if (this.ideas !== null) return this.ideas

    if (!existsSync(this.filePath)) {
      this.ideas = []
      return this.ideas
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        this.ideas = []
        return this.ideas
      }
      this.ideas = parsed as Idea[]
    } catch {
      this.ideas = []
    }

    return this.ideas
  }

  private persist(): void {
    const ideas = this.load()
    const dir = dirname(this.filePath)
    mkdirSync(dir, { recursive: true })

    const tmp = join(dir, `.ideas-${Date.now()}.tmp`)
    writeFileSync(tmp, JSON.stringify(ideas, null, 2), 'utf-8')
    renameSync(tmp, this.filePath)
  }

  getAll(): Idea[] {
    return [...this.load()]
  }

  getById(id: string): Idea | undefined {
    return this.load().find((i) => i.id === id)
  }

  create(request: CreateIdeaRequest): Idea {
    const ideas = this.load()
    const now = Date.now()

    const maxOrder = ideas.length > 0 ? Math.max(...ideas.map((i) => i.order)) : -1

    const idea: Idea = {
      id: randomUUID(),
      title: request.title,
      description: request.description,
      projectId: request.projectId,
      priority: request.priority ?? null,
      createdAt: now,
      updatedAt: now,
      order: maxOrder + 1,
    }

    ideas.push(idea)
    this.markDirty()
    return idea
  }

  update(id: string, updates: Omit<UpdateIdeaRequest, 'id'>): boolean {
    const ideas = this.load()
    const idea = ideas.find((i) => i.id === id)
    if (!idea) return false

    if (updates.title !== undefined) idea.title = updates.title
    if (updates.description !== undefined) idea.description = updates.description
    if (updates.projectId !== undefined) idea.projectId = updates.projectId
    if (updates.priority !== undefined) idea.priority = updates.priority

    idea.updatedAt = Date.now()
    this.markDirty()
    return true
  }

  delete(id: string): boolean {
    const ideas = this.load()
    const idx = ideas.findIndex((i) => i.id === id)
    if (idx === -1) return false

    ideas.splice(idx, 1)
    this.markDirty()
    return true
  }
}
