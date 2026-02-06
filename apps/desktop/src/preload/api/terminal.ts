/**
 * Terminal Namespace Builder
 *
 * Builds the `terminal` namespace for the preload API,
 * including per-terminal onData routing via the shared dataSubscribers map.
 */

import { ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipcContracts'
import { safeInvoke, dataSubscribers } from '../safeInvoke'
import type { ElectronAPI } from '../types'
import type { CommandCompletionEvent } from '../../shared/types'
import type { LayoutNode } from '../../shared/terminalLayout'

export function buildTerminalAPI(): ElectronAPI['terminal'] {
  return {
    create: (request) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_CREATE, request) as Promise<{ created: boolean }>,
    write: (request) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_WRITE, request) as Promise<void>,
    resize: (request) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_RESIZE, request) as Promise<void>,
    kill: (terminalId) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_KILL, { terminalId }) as Promise<void>,
    killAll: (projectId) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_KILL_ALL, projectId) as Promise<void>,
    getBuffer: (terminalId) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_GET_BUFFER, { terminalId }) as Promise<string>,
    getLayout: (projectId) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_GET_LAYOUT, { projectId }) as Promise<LayoutNode | null>,
    setLayout: (projectId, layout) =>
      safeInvoke(IPC_CHANNELS.TERMINAL_SET_LAYOUT, { projectId, layout }) as Promise<void>,
    onData: (terminalId, callback) => {
      let subs = dataSubscribers.get(terminalId)
      if (!subs) {
        subs = new Set()
        dataSubscribers.set(terminalId, subs)
      }
      subs.add(callback)
      return () => {
        const set = dataSubscribers.get(terminalId)
        if (set) {
          set.delete(callback)
          if (set.size === 0) dataSubscribers.delete(terminalId)
        }
      }
    },
    onExit: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        terminalId: string,
        exitCode: number,
      ) => {
        callback(terminalId, exitCode)
      }
      ipcRenderer.on('terminal:exit', listener)
      return () => {
        ipcRenderer.removeListener('terminal:exit', listener)
      }
    },
    onCommandDone: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, event: CommandCompletionEvent) => {
        callback(event)
      }
      ipcRenderer.on('terminal:command-done', listener)
      return () => {
        ipcRenderer.removeListener('terminal:command-done', listener)
      }
    },
  }
}
