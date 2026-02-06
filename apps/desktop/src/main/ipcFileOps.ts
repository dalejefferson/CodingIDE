/**
 * File Operations IPC Handlers
 *
 * Registers handlers for file create, read, write, and directory listing.
 * All paths are resolved relative to the project root via ProjectStore.
 */

import { IPC_CHANNELS } from '../shared/ipcContracts'
import * as fileOps from '@services/fileOpsService'
import type { IPCRouter } from './ipcRouter'
import type { ProjectStore } from '@services/projectStore'

export function setupFileOpsIPC(router: IPCRouter, projectStore: ProjectStore): void {
  router.handle(IPC_CHANNELS.FILE_CREATE, async (_event, payload) => {
    const project = projectStore.getById(payload.projectId)
    if (!project)
      return { ok: false, error: { code: 'UNKNOWN' as const, message: 'Project not found' } }
    return fileOps.createFile(project.path, payload.relPath, payload.contents, payload.mkdirp)
  })

  router.handle(IPC_CHANNELS.FILE_READ, async (_event, payload) => {
    const project = projectStore.getById(payload.projectId)
    if (!project)
      return { ok: false, error: { code: 'UNKNOWN' as const, message: 'Project not found' } }
    return fileOps.readFile(project.path, payload.relPath)
  })

  router.handle(IPC_CHANNELS.FILE_WRITE, async (_event, payload) => {
    const project = projectStore.getById(payload.projectId)
    if (!project)
      return { ok: false, error: { code: 'UNKNOWN' as const, message: 'Project not found' } }
    return fileOps.writeFile(project.path, payload.relPath, payload.contents, payload.mode)
  })

  router.handle(IPC_CHANNELS.FILE_LIST, (_event, payload) => {
    const project = projectStore.getById(payload.projectId)
    if (!project) return []
    try {
      return fileOps.listDir(project.path, payload.dirPath)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[FILE_LIST] listDir failed for "${project.path}/${payload.dirPath}":`, msg)
      throw err
    }
  })
}
