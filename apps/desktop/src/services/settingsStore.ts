import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

interface AppSettings {
  openaiApiKey?: string
  claudeApiKey?: string
}

/**
 * JSON file-based app settings store.
 *
 * Follows the same atomic write pattern as ProjectStore/ThemeStore.
 * Stores general app settings like API keys.
 */
export class SettingsStore {
  private filePath: string
  private cached: AppSettings | null = null
  private dirty = false
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  constructor(filePath: string) {
    this.filePath = filePath
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

  private markDirty(): void {
    this.dirty = true
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        this.flush()
      }, 500)
    }
  }

  private load(): AppSettings {
    if (this.cached !== null) return this.cached

    if (!existsSync(this.filePath)) {
      this.cached = {}
      return this.cached
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null) {
        this.cached = parsed as AppSettings
      } else {
        this.cached = {}
      }
    } catch {
      this.cached = {}
    }

    return this.cached
  }

  private persist(): void {
    const settings = this.load()
    const dir = dirname(this.filePath)
    mkdirSync(dir, { recursive: true })

    const tmp = join(dir, `.settings-${Date.now()}.tmp`)
    writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf-8')
    renameSync(tmp, this.filePath)
  }

  getOpenAIKey(): string | null {
    const settings = this.load()
    return settings.openaiApiKey ?? null
  }

  setOpenAIKey(key: string): void {
    const settings = this.load()
    settings.openaiApiKey = key
    this.cached = settings
    this.markDirty()
  }

  getClaudeKey(): string | null {
    const settings = this.load()
    return settings.claudeApiKey ?? null
  }

  setClaudeKey(key: string): void {
    const settings = this.load()
    settings.claudeApiKey = key
    this.cached = settings
    this.markDirty()
  }
}
