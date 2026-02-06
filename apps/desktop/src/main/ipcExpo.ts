/**
 * App Builder / Expo IPC Handlers
 *
 * Registers handlers for Expo project creation, Metro dev server
 * lifecycle, folder dialogs, mobile-app-to-project bridging,
 * template cache management, and mobile PRD generation.
 */

import { BrowserWindow, dialog } from 'electron'
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { IPC_CHANNELS } from '../shared/ipcContracts'
import { ExpoService } from '@services/expoService'
import { generateMobilePRD } from '@services/mobilePrdService'
import { MOBILE_PALETTES } from '../shared/mobilePalettes'
import type { IPCRouter } from './ipcRouter'
import type { MobileAppStore } from '@services/mobileAppStore'
import type { ProjectStore } from '@services/projectStore'
import type { TemplateCacheService } from '@services/templateCache'
import type { SettingsStore } from '@services/settingsStore'

export function setupExpoIPC(
  router: IPCRouter,
  mobileAppStore: MobileAppStore,
  projectStore: ProjectStore,
  settingsStore: SettingsStore,
  templateCache: TemplateCacheService,
  getMainWindow: () => BrowserWindow | null,
): { expoService: ExpoService } {
  const expoService = new ExpoService((appId, status, expoUrl, webUrl, error) => {
    // Update store
    mobileAppStore.setStatus(appId, status)
    mobileAppStore.setExpoUrl(appId, expoUrl)
    mobileAppStore.setWebUrl(appId, webUrl)
    if (error) mobileAppStore.setError(appId, error)

    // Broadcast to renderer
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      const app = mobileAppStore.getById(appId)
      if (app) win.webContents.send('expo:status-changed', app)
    }
  })

  // ── Get All Apps ────────────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_GET_ALL, () => {
    return mobileAppStore.getAll()
  })

  // ── Create App (from cached template) ──────────────────────
  router.handle(IPC_CHANNELS.EXPO_CREATE, async (_event, payload) => {
    const projectPath = await templateCache.createFromTemplate(
      payload.template,
      payload.parentDir,
      payload.name,
    )
    const app = mobileAppStore.create(payload, projectPath)

    // Save PRD artifacts if provided
    if (payload.prdContent) {
      const prdDir = join(projectPath, '.prd')
      mkdirSync(prdDir, { recursive: true })
      writeFileSync(join(prdDir, 'prd.md'), payload.prdContent, 'utf-8')
      if (payload.paletteId) {
        writeFileSync(
          join(prdDir, 'palette.json'),
          JSON.stringify({ paletteId: payload.paletteId }),
          'utf-8',
        )
      }
    }

    // Copy reference images if provided
    if (payload.imagePaths && payload.imagePaths.length > 0) {
      const imagesDir = join(projectPath, '.prd', 'images')
      mkdirSync(imagesDir, { recursive: true })
      for (const srcPath of payload.imagePaths) {
        const destPath = join(imagesDir, basename(srcPath))
        copyFileSync(srcPath, destPath)
      }
    }

    return app
  })

  // ── Add Existing App ───────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_ADD, (_event, payload) => {
    // Validate it looks like an Expo project
    const appJsonPath = join(payload.path, 'app.json')
    if (!existsSync(appJsonPath)) {
      throw new Error(`Not an Expo project: no app.json found at ${payload.path}`)
    }
    return mobileAppStore.add(payload)
  })

  // ── Remove App ─────────────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_REMOVE, async (_event, payload) => {
    // Stop Metro if running
    if (expoService.isRunning(payload)) {
      await expoService.stop(payload)
    }
    mobileAppStore.remove(payload)
  })

  // ── Start Metro ────────────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_START, async (_event, payload) => {
    const app = mobileAppStore.getById(payload.appId)
    if (!app) throw new Error(`Mobile app not found: ${payload.appId}`)
    await expoService.start(app)
  })

  // ── Stop Metro ─────────────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_STOP, async (_event, payload) => {
    await expoService.stop(payload.appId)
  })

  // ── Get Status ─────────────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_STATUS, (_event, payload) => {
    return expoService.getStatus(payload.appId)
  })

  // ── Open Folder Dialog (select existing Expo project) ──────
  router.handle(IPC_CHANNELS.EXPO_OPEN_FOLDER_DIALOG, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Expo Project Folder',
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0] ?? null
  })

  // ── Choose Parent Directory (for new project creation) ─────
  router.handle(IPC_CHANNELS.EXPO_CHOOSE_PARENT_DIR, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose where to create your mobile app',
      buttonLabel: 'Create Here',
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0] ?? null
  })

  // ── Open Mobile App as Project ─────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_OPEN_AS_PROJECT, (_event, payload) => {
    const app = mobileAppStore.getById(payload.appId)
    if (!app) throw new Error(`Mobile app not found: ${payload.appId}`)

    return projectStore.add({ path: app.path })
  })

  // ── Template Status ──────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_TEMPLATE_STATUS, () => {
    return templateCache.getStatus()
  })

  // ── Refresh Templates ────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_REFRESH_TEMPLATES, async () => {
    await templateCache.refreshTemplates()
  })

  // ── Ensure Templates ─────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_ENSURE_TEMPLATES, async () => {
    await templateCache.ensureExtracted()
  })

  // ── Generate Mobile PRD ──────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_GENERATE_PRD, async (_event, payload) => {
    const claudeKey = settingsStore.getClaudeKey()
    const openaiKey = settingsStore.getOpenAIKey()
    if (!claudeKey && !openaiKey) {
      throw new Error('No API key configured. Add an OpenAI or Claude key in Settings.')
    }
    // Look up full palette data for richer PRD context
    const palette = payload.paletteId
      ? MOBILE_PALETTES.find((p) => p.id === payload.paletteId) ?? null
      : null
    const content = await generateMobilePRD(
      claudeKey,
      openaiKey,
      payload.appDescription,
      payload.template,
      palette,
      payload.imagePaths,
    )
    return { content }
  })

  // ── API Key Status ───────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_API_KEY_STATUS, () => {
    const hasOpenAI = !!settingsStore.getOpenAIKey()
    const hasClaude = !!settingsStore.getClaudeKey()
    return { hasOpenAI, hasClaude, hasAny: hasOpenAI || hasClaude }
  })

  // ── Save PRD ─────────────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_SAVE_PRD, (_event, payload) => {
    const prdDir = join(payload.appPath, '.prd')
    mkdirSync(prdDir, { recursive: true })
    writeFileSync(join(prdDir, 'prd.md'), payload.prdContent, 'utf-8')
    if (payload.paletteId) {
      writeFileSync(
        join(prdDir, 'palette.json'),
        JSON.stringify({ paletteId: payload.paletteId }),
        'utf-8',
      )
    }
  })

  // ── Copy PRD Images ──────────────────────────────────────
  router.handle(IPC_CHANNELS.EXPO_COPY_PRD_IMAGES, (_event, payload) => {
    const imagesDir = join(payload.appPath, '.prd', 'images')
    mkdirSync(imagesDir, { recursive: true })
    for (const srcPath of payload.imagePaths) {
      const destPath = join(imagesDir, basename(srcPath))
      copyFileSync(srcPath, destPath)
    }
  })

  return { expoService }
}
