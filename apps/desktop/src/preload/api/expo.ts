/**
 * Expo + Word Vomit Namespace Builders
 *
 * Builds the `expo` and `wordVomit` namespaces for the preload API.
 */

import { ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipcContracts'
import { safeInvoke } from '../safeInvoke'
import type { ElectronAPI } from '../types'
import type { MobileApp } from '../../shared/types'

export function buildExpoAPI(): ElectronAPI['expo'] {
  return {
    getAll: () => safeInvoke(IPC_CHANNELS.EXPO_GET_ALL) as Promise<MobileApp[]>,
    create: (request) =>
      safeInvoke(IPC_CHANNELS.EXPO_CREATE, request) as Promise<MobileApp>,
    add: (request) =>
      safeInvoke(IPC_CHANNELS.EXPO_ADD, request) as Promise<MobileApp>,
    remove: (id) => safeInvoke(IPC_CHANNELS.EXPO_REMOVE, id) as Promise<void>,
    start: (request) =>
      safeInvoke(IPC_CHANNELS.EXPO_START, request) as Promise<void>,
    stop: (request) =>
      safeInvoke(IPC_CHANNELS.EXPO_STOP, request) as Promise<void>,
    getStatus: (request) =>
      safeInvoke(IPC_CHANNELS.EXPO_STATUS, request) as ReturnType<ElectronAPI['expo']['getStatus']>,
    openFolderDialog: () =>
      safeInvoke(IPC_CHANNELS.EXPO_OPEN_FOLDER_DIALOG) as Promise<string | null>,
    chooseParentDir: () =>
      safeInvoke(IPC_CHANNELS.EXPO_CHOOSE_PARENT_DIR) as Promise<string | null>,
    openAsProject: (request) =>
      safeInvoke(IPC_CHANNELS.EXPO_OPEN_AS_PROJECT, request) as ReturnType<ElectronAPI['expo']['openAsProject']>,
    onStatusChanged: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, app: MobileApp) => {
        callback(app)
      }
      ipcRenderer.on('expo:status-changed', listener)
      return () => {
        ipcRenderer.removeListener('expo:status-changed', listener)
      }
    },
    getTemplateStatus: () =>
      safeInvoke(IPC_CHANNELS.EXPO_TEMPLATE_STATUS) as ReturnType<ElectronAPI['expo']['getTemplateStatus']>,
    refreshTemplates: () => safeInvoke(IPC_CHANNELS.EXPO_REFRESH_TEMPLATES) as Promise<void>,
    ensureTemplates: () => safeInvoke(IPC_CHANNELS.EXPO_ENSURE_TEMPLATES) as Promise<void>,
    generatePRD: (request) =>
      safeInvoke(IPC_CHANNELS.EXPO_GENERATE_PRD, request) as ReturnType<ElectronAPI['expo']['generatePRD']>,
    getApiKeyStatus: () =>
      safeInvoke(IPC_CHANNELS.EXPO_API_KEY_STATUS) as ReturnType<ElectronAPI['expo']['getApiKeyStatus']>,
    savePRD: (request) =>
      safeInvoke(IPC_CHANNELS.EXPO_SAVE_PRD, request) as Promise<void>,
    copyPRDImages: (request) =>
      safeInvoke(IPC_CHANNELS.EXPO_COPY_PRD_IMAGES, request) as Promise<void>,
  }
}

export function buildWordVomitAPI(): ElectronAPI['wordVomit'] {
  return {
    generatePRD: (request) =>
      safeInvoke(
        IPC_CHANNELS.WORD_VOMIT_GENERATE_PRD,
        request,
      ) as ReturnType<ElectronAPI['wordVomit']['generatePRD']>,
  }
}
