/**
 * App Builder / Expo IPC Handlers
 *
 * Registers handlers for Expo project creation, Metro dev server
 * lifecycle, folder dialogs, and mobile-app-to-project bridging.
 */

import { BrowserWindow, dialog } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { IPC_CHANNELS } from '../shared/ipcContracts'
import { ExpoService } from '@services/expoService'
import type { IPCRouter } from './ipcRouter'
import type { MobileAppStore } from '@services/mobileAppStore'
import type { ProjectStore } from '@services/projectStore'

export function setupExpoIPC(
  router: IPCRouter,
  mobileAppStore: MobileAppStore,
  projectStore: ProjectStore,
  getMainWindow: () => BrowserWindow | null,
): { expoService: ExpoService } {
  const expoService = new ExpoService((appId, status, expoUrl, error) => {
    // Update store
    mobileAppStore.setStatus(appId, status)
    mobileAppStore.setExpoUrl(appId, expoUrl)
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

  // ── Create App (scaffold with create-expo-app) ─────────────
  router.handle(IPC_CHANNELS.EXPO_CREATE, async (_event, payload) => {
    const projectPath = await expoService.create(payload.name, payload.template, payload.parentDir)
    return mobileAppStore.create(payload, projectPath)
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

  return { expoService }
}
