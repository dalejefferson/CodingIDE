/**
 * Settings IPC Handlers
 *
 * Registers handlers for API key getters/setters (OpenAI, Claude)
 * and the Word Vomit PRD generation endpoint.
 */

import { IPC_CHANNELS } from '../shared/ipcContracts'
import { generateWordVomitPRD } from '@services/wordVomitPrdService'
import type { IPCRouter } from './ipcRouter'
import type { SettingsStore } from '@services/settingsStore'

export function setupSettingsIPC(router: IPCRouter, settingsStore: SettingsStore): void {
  router.handle(IPC_CHANNELS.GET_OPENAI_KEY, () => {
    return settingsStore.getOpenAIKey()
  })

  router.handle(IPC_CHANNELS.SET_OPENAI_KEY, (_event, payload) => {
    settingsStore.setOpenAIKey(payload.key)
  })

  router.handle(IPC_CHANNELS.GET_CLAUDE_KEY, () => {
    return settingsStore.getClaudeKey()
  })

  router.handle(IPC_CHANNELS.SET_CLAUDE_KEY, (_event, payload) => {
    settingsStore.setClaudeKey(payload.key)
  })

  // ── Word Vomit PRD ────────────────────────────────────────
  router.handle(IPC_CHANNELS.WORD_VOMIT_GENERATE_PRD, async (_event, payload) => {
    const claudeKey = settingsStore.getClaudeKey()
    const openaiKey = settingsStore.getOpenAIKey()
    const content = await generateWordVomitPRD(claudeKey, openaiKey, payload.rawIdea)
    return { content }
  })
}
