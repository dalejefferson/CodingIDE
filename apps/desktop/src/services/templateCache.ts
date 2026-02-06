/**
 * Template cache service for offline Expo project scaffolding.
 *
 * Pre-extracted templates live in {userData}/expo-templates/ and are
 * copied (not spawned via npx) when creating new mobile apps.
 * This eliminates network dependency and speeds up project creation.
 */

import { access, cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { logger } from '@services/logger'
import type { ExpoTemplate, TemplateStatus, TemplateStatusResponse } from '@shared/types'
import { EXPO_TEMPLATES } from '@shared/types'

// ── Helpers ──────────────────────────────────────────────────

/** Async existence check using fs/promises access. */
async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/** Extract a tar.gz archive to a directory, returning a Promise. */
function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('tar', ['-xzf', archivePath, '-C', destDir], {
      stdio: 'ignore',
      timeout: 30_000,
    })

    child.on('error', (err) => {
      reject(err)
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`tar exited with code ${code}`))
      }
    })
  })
}

// ── Constants ──────────────────────────────────────────────────

/** Directory names inside the archives (tar was created with this prefix) */
const ARCHIVE_PREFIX: Record<ExpoTemplate, string> = {
  blank: 'template-blank',
  tabs: 'template-tabs',
  drawer: 'template-drawer',
}

// ── Service ────────────────────────────────────────────────────

export class TemplateCacheService {
  private resourcesDir: string
  private cacheDir: string

  /**
   * @param resourcesDir — Where tar.gz archives live (bundled with the app).
   * @param cacheDir — Where extracted templates are cached ({userData}/expo-templates/).
   */
  constructor(resourcesDir: string, cacheDir: string) {
    this.resourcesDir = resourcesDir
    this.cacheDir = cacheDir
  }

  /** Ensure the cache directory exists (lazy init, replaces sync constructor logic). */
  private async ensureCacheDir(): Promise<void> {
    if (!(await exists(this.cacheDir))) {
      await mkdir(this.cacheDir, { recursive: true })
      logger.info('TemplateCache: created cache directory', { cacheDir: this.cacheDir })
    }
  }

  /**
   * Ensure all templates are extracted and ready to use.
   * Skips any template that already has a valid package.json in the cache.
   */
  async ensureExtracted(): Promise<void> {
    await this.ensureCacheDir()

    for (const template of EXPO_TEMPLATES) {
      const extractedDir = join(this.cacheDir, template)
      const marker = join(extractedDir, 'package.json')

      if (await exists(marker)) {
        logger.debug('TemplateCache: already extracted', { template })
        continue
      }

      const archivePath = join(this.resourcesDir, `${template}.tar.gz`)
      if (!(await exists(archivePath))) {
        logger.warn('TemplateCache: archive not found, skipping', { template, archivePath })
        continue
      }

      logger.info('TemplateCache: extracting template', { template, archivePath })

      try {
        // Extract to a temp location within cacheDir, then rename
        const tmpExtract = join(this.cacheDir, `_extracting_${template}`)
        if (await exists(tmpExtract)) {
          await rm(tmpExtract, { recursive: true, force: true })
        }
        await mkdir(tmpExtract, { recursive: true })

        await extractTarGz(archivePath, tmpExtract)

        // The archive contains a folder like "template-blank/", move its contents
        const innerDir = join(tmpExtract, ARCHIVE_PREFIX[template])
        if (await exists(innerDir)) {
          // Remove existing target if partial extraction happened before
          if (await exists(extractedDir)) {
            await rm(extractedDir, { recursive: true, force: true })
          }
          await cp(innerDir, extractedDir, { recursive: true })
        } else {
          // Fallback: archive may have extracted directly
          if (await exists(extractedDir)) {
            await rm(extractedDir, { recursive: true, force: true })
          }
          await cp(tmpExtract, extractedDir, { recursive: true })
        }

        // Clean up temp extraction folder
        await rm(tmpExtract, { recursive: true, force: true })

        logger.info('TemplateCache: extraction complete', { template })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error('TemplateCache: extraction failed', { template, error: message })
      }
    }
  }

  /**
   * Create a new project from a cached template.
   *
   * Copies the extracted template to {targetDir}/{appName}/ and patches
   * package.json name and app.json name/slug fields.
   *
   * @returns Full path to the created project directory.
   */
  async createFromTemplate(
    template: ExpoTemplate,
    targetDir: string,
    appName: string,
  ): Promise<string> {
    const sourceDir = join(this.cacheDir, template)
    const destDir = join(targetDir, appName)

    if (!(await exists(sourceDir))) {
      throw new Error(`Template "${template}" is not extracted. Run ensureExtracted() first.`)
    }

    if (await exists(destDir)) {
      throw new Error(`Target directory already exists: ${destDir}`)
    }

    logger.info('TemplateCache: creating project from template', {
      template,
      appName,
      destDir,
    })

    // Copy entire template
    await cp(sourceDir, destDir, { recursive: true })

    // Patch package.json name
    const pkgPath = join(destDir, 'package.json')
    if (await exists(pkgPath)) {
      try {
        const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'))
        pkg.name = appName
        await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        logger.warn('TemplateCache: failed to patch package.json', { error: message })
      }
    }

    // Patch app.json name and slug
    const appJsonPath = join(destDir, 'app.json')
    if (await exists(appJsonPath)) {
      try {
        const appJson = JSON.parse(await readFile(appJsonPath, 'utf-8'))
        if (appJson.expo) {
          appJson.expo.name = appName
          appJson.expo.slug = appName
        }
        await writeFile(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf-8')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        logger.warn('TemplateCache: failed to patch app.json', { error: message })
      }
    }

    logger.info('TemplateCache: project created', { template, appName, destDir })
    return destDir
  }

  /**
   * Delete all extracted templates and re-extract from archives.
   * Useful when the user updates the bundled archives.
   */
  async refreshTemplates(): Promise<void> {
    logger.info('TemplateCache: refreshing all templates')

    for (const template of EXPO_TEMPLATES) {
      const extractedDir = join(this.cacheDir, template)
      if (await exists(extractedDir)) {
        await rm(extractedDir, { recursive: true, force: true })
        logger.debug('TemplateCache: removed cached template', { template })
      }
    }

    await this.ensureExtracted()
  }

  /**
   * Return readiness status for all templates.
   */
  async getStatus(): Promise<TemplateStatusResponse> {
    const templates: TemplateStatus[] = []

    for (const template of EXPO_TEMPLATES) {
      const extractedDir = join(this.cacheDir, template)
      const marker = join(extractedDir, 'package.json')
      const ready = await exists(marker)

      let extractedAt: number | null = null
      if (ready) {
        try {
          const s = await stat(marker)
          extractedAt = s.mtimeMs
        } catch {
          // Ignore stat errors
        }
      }

      templates.push({ template, ready, extractedAt })
    }

    const allReady = templates.every((t) => t.ready)
    return { templates, allReady }
  }

  /**
   * Check whether a specific template is extracted and ready.
   */
  async isReady(template: ExpoTemplate): Promise<boolean> {
    const extractedDir = join(this.cacheDir, template)
    const marker = join(extractedDir, 'package.json')
    return exists(marker)
  }
}
