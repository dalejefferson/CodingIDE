/**
 * Projects Namespace Builder
 *
 * Builds the `projects` namespace for the preload API,
 * including project CRUD and the status-changed push listener.
 */

import { ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipcContracts'
import { safeInvoke } from '../safeInvoke'
import type { ElectronAPI } from '../types'

export function buildProjectsAPI(): ElectronAPI['projects'] {
  return {
    openFolderDialog: () => safeInvoke(IPC_CHANNELS.OPEN_FOLDER_DIALOG) as Promise<string | null>,
    createFolder: (request) =>
      safeInvoke(IPC_CHANNELS.CREATE_PROJECT_FOLDER, request) as Promise<string | null>,
    getAll: () => safeInvoke(IPC_CHANNELS.GET_PROJECTS) as ReturnType<ElectronAPI['projects']['getAll']>,
    add: (request) =>
      safeInvoke(IPC_CHANNELS.ADD_PROJECT, request) as ReturnType<ElectronAPI['projects']['add']>,
    remove: (id) => safeInvoke(IPC_CHANNELS.REMOVE_PROJECT, id) as Promise<void>,
    setStatus: (request) =>
      safeInvoke(IPC_CHANNELS.SET_PROJECT_STATUS, request) as Promise<void>,
    onStatusChanged: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, change: Parameters<typeof callback>[0]) => {
        callback(change)
      }
      ipcRenderer.on('project:status-changed', listener)
      return () => {
        ipcRenderer.removeListener('project:status-changed', listener)
      }
    },
  }
}
