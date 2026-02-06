/**
 * IPC Orchestrator
 *
 * Creates all stores, wires dependencies, and delegates handler
 * registration to domain-specific modules. Exports setupIPC(),
 * killAllTerminals(), and disposeIPC() for the app lifecycle.
 */

import { app } from 'electron'
import { join } from 'node:path'
import { IPCRouter } from './ipcRouter'
import { ProjectStore } from '@services/projectStore'
import { ThemeStore } from '@services/themeStore'
import { TerminalService } from '@services/terminalService'
import { TerminalLayoutStore } from '@services/terminalLayoutStore'
import { TicketStore } from '@services/ticketStore'
import { SettingsStore } from '@services/settingsStore'
import { MobileAppStore } from '@services/mobileAppStore'
import { TemplateCacheService } from '@services/templateCache'
import { IdeaStore } from '@services/ideaStore'
import {
  getMainWindow,
  sendToRenderer,
  broadcastStatusChange,
  clearCachedMainWindow,
} from './ipcHelpers'
import { setupProjectIPC, flushPresetStore } from './ipcProject'
import { setupTerminalIPC } from './ipcTerminal'
import { setupTicketIPC } from './ipcTicket'
import { setupSettingsIPC } from './ipcSettings'
import { setupFileOpsIPC } from './ipcFileOps'
import { setupIdeaIPC } from './ipcIdea'
import { setupClaudePolling, type ClaudePollingState } from './ipcClaude'
import { setupRalphIPC } from './ipcRalph'
import { setupExpoIPC } from './ipcExpo'
import { setupPortIPC } from './ipcPort'

let router: IPCRouter | null = null
let projectStore: ProjectStore | null = null
let themeStore: ThemeStore | null = null
let terminalService: TerminalService | null = null
let terminalLayoutStore: TerminalLayoutStore | null = null
let ticketStore: TicketStore | null = null
let settingsStore: SettingsStore | null = null
let mobileAppStore: MobileAppStore | null = null
let templateCacheService: TemplateCacheService | null = null
let ideaStore: IdeaStore | null = null
let expoServiceRef: { expoService: import('@services/expoService').ExpoService } | null = null
let claudePolling: ClaudePollingState | null = null

/** Lazy getter — IdeaStore is only needed when Idea Log is opened. */
function getIdeaStore(): IdeaStore {
  if (!ideaStore) ideaStore = new IdeaStore(join(app.getPath('userData'), 'ideas.json'))
  return ideaStore
}

export function setupIPC(): void {
  router = new IPCRouter()
  projectStore = new ProjectStore(join(app.getPath('userData'), 'projects.json'))
  themeStore = new ThemeStore(join(app.getPath('userData'), 'theme.json'))
  terminalService = new TerminalService()
  terminalLayoutStore = new TerminalLayoutStore(
    join(app.getPath('userData'), 'terminal-layouts.json'),
  )
  ticketStore = new TicketStore(join(app.getPath('userData'), 'tickets.json'))
  settingsStore = new SettingsStore(join(app.getPath('userData'), 'settings.json'))
  mobileAppStore = new MobileAppStore(join(app.getPath('userData'), 'mobile-apps.json'))

  // ── Template Cache ──────────────────────────────────────────
  const resourcesDir = join(__dirname, '../../resources/expo-templates')
  const cacheDir = join(app.getPath('userData'), 'expo-templates')
  templateCacheService = new TemplateCacheService(resourcesDir, cacheDir)
  templateCacheService.ensureExtracted().catch((err) => {
    console.error('Template extraction failed:', err)
  })

  // ── Domain Handler Modules ──────────────────────────────────
  setupProjectIPC(router, projectStore, themeStore, terminalService, sendToRenderer)

  setupTerminalIPC(
    router,
    terminalService,
    terminalLayoutStore,
    getMainWindow,
    sendToRenderer,
    () => claudePolling?.lastActivity ?? {},
    (projectId) => {
      projectStore!.setStatus(projectId, 'idle')
      broadcastStatusChange(projectId, 'idle')
    },
  )

  setupTicketIPC(router, ticketStore)
  setupSettingsIPC(router, settingsStore)
  setupFileOpsIPC(router, projectStore)
  setupIdeaIPC(router, getIdeaStore)

  // ── Ralph / PRD ─────────────────────────────────────────────
  setupRalphIPC(router, ticketStore, settingsStore, projectStore, getMainWindow)

  // ── App Builder / Expo ──────────────────────────────────────
  expoServiceRef = setupExpoIPC(
    router,
    mobileAppStore,
    projectStore,
    settingsStore,
    templateCacheService,
    getMainWindow,
  )

  // ── Port Service ──────────────────────────────────────────────
  setupPortIPC(router)

  // ── Claude Activity Polling ─────────────────────────────────
  claudePolling = setupClaudePolling(terminalService, projectStore, sendToRenderer)
}

/** Kill all running PTY processes without tearing down IPC or stores. */
export function killAllTerminals(): void {
  terminalService?.killAll()
}

export async function disposeIPC(): Promise<void> {
  if (claudePolling) {
    claudePolling.dispose()
    claudePolling = null
  }
  if (expoServiceRef) {
    await expoServiceRef.expoService.stopAll()
    expoServiceRef = null
  }
  mobileAppStore?.flush()
  ideaStore?.flush()
  terminalService?.killAll()
  projectStore?.flush()
  themeStore?.flush()
  terminalLayoutStore?.flush()
  flushPresetStore()
  ticketStore?.flush()
  settingsStore?.flush()
  clearCachedMainWindow()
  router?.dispose()
  router = null
  projectStore = null
  themeStore = null
  terminalService = null
  terminalLayoutStore = null
  ticketStore = null
  settingsStore = null
  mobileAppStore = null
  templateCacheService = null
  ideaStore = null
}
