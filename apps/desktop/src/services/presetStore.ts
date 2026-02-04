import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { CommandPreset } from '@shared/types'

/**
 * JSON file-based command preset store.
 *
 * Persists command presets as a global flat array in a single JSON file:
 *   CommandPreset[]
 *
 * Uses atomic writes (write-to-temp + rename) to prevent data loss.
 */
export class PresetStore {
  private filePath: string
  private data: CommandPreset[] | null = null

  constructor(filePath: string) {
    this.filePath = filePath
  }

  private load(): CommandPreset[] {
    if (this.data !== null) return this.data

    if (!existsSync(this.filePath)) {
      this.data = []
      return this.data
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        this.data = []
        return this.data
      }
      this.data = parsed as CommandPreset[]
    } catch {
      this.data = []
    }

    return this.data
  }

  private persist(): void {
    const data = this.load()
    const dir = dirname(this.filePath)
    mkdirSync(dir, { recursive: true })

    const tmp = join(dir, `.command-presets-${Date.now()}.tmp`)
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
    renameSync(tmp, this.filePath)
  }

  getAll(): CommandPreset[] {
    return this.load()
  }

  setAll(presets: CommandPreset[]): void {
    this.data = presets
    this.persist()
  }
}
