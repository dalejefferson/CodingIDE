import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ThemeId } from '@shared/types'

/**
 * JSON file-based global theme store.
 *
 * Persists the user's global theme preference to disk using the same
 * atomic write-to-temp + rename pattern as ProjectStore.
 *
 * File format: `{ "theme": "light" | "dark" }`
 */
export class ThemeStore {
  private filePath: string
  private cached: ThemeId | null = null
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
    const dir = dirname(this.filePath)
    mkdirSync(dir, { recursive: true })
    const tmp = join(dir, `.theme-${Date.now()}.tmp`)
    writeFileSync(tmp, JSON.stringify({ theme: this.cached }, null, 2), 'utf-8')
    renameSync(tmp, this.filePath)
  }

  get(): ThemeId {
    if (this.cached !== null) return this.cached

    if (!existsSync(this.filePath)) {
      this.cached = 'light'
      return this.cached
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'theme' in parsed &&
        (parsed as Record<string, unknown>)['theme'] === 'dark'
      ) {
        this.cached = 'dark'
      } else {
        this.cached = 'light'
      }
    } catch {
      this.cached = 'light'
    }

    return this.cached
  }

  set(theme: ThemeId): void {
    this.cached = theme
    this.dirty = true
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        this.flush()
      }, 500)
    }
  }
}
