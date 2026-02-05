/**
 * Template cache service for offline Expo project scaffolding.
 *
 * Pre-extracted templates live in {userData}/expo-templates/ and are
 * copied (not spawned via npx) when creating new mobile apps.
 * This eliminates network dependency and speeds up project creation.
 */

import {
  existsSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { logger } from '@services/logger'
import type { ExpoTemplate, TemplateStatus, TemplateStatusResponse } from '@shared/types'
import { EXPO_TEMPLATES } from '@shared/types'

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

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
      logger.info('TemplateCache: created cache directory', { cacheDir })
    }
  }

  /**
   * Ensure all templates are extracted and ready to use.
   * Skips any template that already has a valid package.json in the cache.
   */
  async ensureExtracted(): Promise<void> {
    for (const template of EXPO_TEMPLATES) {
      const extractedDir = join(this.cacheDir, template)
      const marker = join(extractedDir, 'package.json')

      if (existsSync(marker)) {
        logger.debug('TemplateCache: already extracted', { template })
        continue
      }

      const archivePath = join(this.resourcesDir, `${template}.tar.gz`)
      if (!existsSync(archivePath)) {
        logger.warn('TemplateCache: archive not found, skipping', { template, archivePath })
        continue
      }

      logger.info('TemplateCache: extracting template', { template, archivePath })

      try {
        // Extract to a temp location within cacheDir, then rename
        const tmpExtract = join(this.cacheDir, `_extracting_${template}`)
        if (existsSync(tmpExtract)) {
          rmSync(tmpExtract, { recursive: true, force: true })
        }
        mkdirSync(tmpExtract, { recursive: true })

        execSync(`tar -xzf "${archivePath}" -C "${tmpExtract}"`, {
          timeout: 30_000,
        })

        // The archive contains a folder like "template-blank/", move its contents
        const innerDir = join(tmpExtract, ARCHIVE_PREFIX[template])
        if (existsSync(innerDir)) {
          // Remove existing target if partial extraction happened before
          if (existsSync(extractedDir)) {
            rmSync(extractedDir, { recursive: true, force: true })
          }
          cpSync(innerDir, extractedDir, { recursive: true })
        } else {
          // Fallback: archive may have extracted directly
          if (existsSync(extractedDir)) {
            rmSync(extractedDir, { recursive: true, force: true })
          }
          cpSync(tmpExtract, extractedDir, { recursive: true })
        }

        // Clean up temp extraction folder
        rmSync(tmpExtract, { recursive: true, force: true })

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
  createFromTemplate(template: ExpoTemplate, targetDir: string, appName: string): string {
    const sourceDir = join(this.cacheDir, template)
    const destDir = join(targetDir, appName)

    if (!existsSync(sourceDir)) {
      throw new Error(`Template "${template}" is not extracted. Run ensureExtracted() first.`)
    }

    if (existsSync(destDir)) {
      throw new Error(`Target directory already exists: ${destDir}`)
    }

    logger.info('TemplateCache: creating project from template', {
      template,
      appName,
      destDir,
    })

    // Copy entire template
    cpSync(sourceDir, destDir, { recursive: true })

    // Patch package.json name
    const pkgPath = join(destDir, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        pkg.name = appName
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        logger.warn('TemplateCache: failed to patch package.json', { error: message })
      }
    }

    // Patch app.json name and slug
    const appJsonPath = join(destDir, 'app.json')
    if (existsSync(appJsonPath)) {
      try {
        const appJson = JSON.parse(readFileSync(appJsonPath, 'utf-8'))
        if (appJson.expo) {
          appJson.expo.name = appName
          appJson.expo.slug = appName
        }
        writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf-8')
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
      if (existsSync(extractedDir)) {
        rmSync(extractedDir, { recursive: true, force: true })
        logger.debug('TemplateCache: removed cached template', { template })
      }
    }

    await this.ensureExtracted()
  }

  /**
   * Return readiness status for all templates.
   */
  getStatus(): TemplateStatusResponse {
    const templates: TemplateStatus[] = EXPO_TEMPLATES.map((template) => {
      const extractedDir = join(this.cacheDir, template)
      const marker = join(extractedDir, 'package.json')
      const ready = existsSync(marker)

      let extractedAt: number | null = null
      if (ready) {
        try {
          extractedAt = statSync(marker).mtimeMs
        } catch {
          // Ignore stat errors
        }
      }

      return { template, ready, extractedAt }
    })

    const allReady = templates.every((t) => t.ready)
    return { templates, allReady }
  }

  /**
   * Check whether a specific template is extracted and ready.
   */
  isReady(template: ExpoTemplate): boolean {
    const extractedDir = join(this.cacheDir, template)
    const marker = join(extractedDir, 'package.json')
    return existsSync(marker)
  }
}
