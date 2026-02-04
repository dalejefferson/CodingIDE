/**
 * Terminal Layout Persistence — per-project layout storage.
 *
 * Persists the terminal split layout tree for each project as JSON.
 * Uses the same atomic-write pattern as ProjectStore.
 */

import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { LayoutNode } from '@shared/terminalLayout'
import { isValidLayout } from '@shared/terminalLayout'

export class TerminalLayoutStore {
  private filePath: string
  private layouts: Record<string, LayoutNode> | null = null

  private dirty = false
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  constructor(filePath: string) {
    this.filePath = filePath
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

  private load(): Record<string, LayoutNode> {
    if (this.layouts !== null) return this.layouts

    if (!existsSync(this.filePath)) {
      this.layouts = {}
      return this.layouts
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        this.layouts = {}
        return this.layouts
      }
      // Validate each entry
      const record = parsed as Record<string, unknown>
      this.layouts = {}
      for (const [key, value] of Object.entries(record)) {
        if (isValidLayout(value)) {
          this.layouts[key] = value
        }
      }
    } catch {
      this.layouts = {}
    }

    return this.layouts
  }

  private persist(): void {
    const layouts = this.load()
    const dir = dirname(this.filePath)
    mkdirSync(dir, { recursive: true })

    const tmp = join(dir, `.terminal-layouts-${Date.now()}.tmp`)
    writeFileSync(tmp, JSON.stringify(layouts, null, 2), 'utf-8')
    renameSync(tmp, this.filePath)
  }

  /** Get the layout for a project, or null if none saved */
  get(projectId: string): LayoutNode | null {
    return this.load()[projectId] ?? null
  }

  /** Save or update the layout for a project */
  set(projectId: string, layout: LayoutNode): void {
    this.load()[projectId] = layout
    this.dirty = true
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        this.flush()
      }, 500)
    }
  }

  /** Remove the layout for a project */
  remove(projectId: string): void {
    const layouts = this.load()
    delete layouts[projectId]
    this.dirty = true
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        this.flush()
      }, 500)
    }
  }
}
