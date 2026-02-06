/**
 * Idea Log IPC Handlers
 *
 * Registers handlers for idea CRUD (get all, create, update, delete).
 * Uses a lazy getter so the IdeaStore is only instantiated when needed.
 */

import { IPC_CHANNELS } from '../shared/ipcContracts'
import type { IPCRouter } from './ipcRouter'
import type { IdeaStore } from '@services/ideaStore'

export function setupIdeaIPC(router: IPCRouter, getIdeaStore: () => IdeaStore): void {
  router.handle(IPC_CHANNELS.IDEA_GET_ALL, () => {
    return getIdeaStore().getAll()
  })

  router.handle(IPC_CHANNELS.IDEA_CREATE, (_event, payload) => {
    return getIdeaStore().create(payload)
  })

  router.handle(IPC_CHANNELS.IDEA_UPDATE, (_event, payload) => {
    getIdeaStore().update(payload.id, payload)
  })

  router.handle(IPC_CHANNELS.IDEA_DELETE, (_event, payload) => {
    getIdeaStore().delete(payload)
  })

  router.handle(IPC_CHANNELS.IDEA_DELETE_BY_PROJECT, (_event, payload) => {
    return getIdeaStore().deleteByProjectId(payload)
  })
}
