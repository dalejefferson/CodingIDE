/**
 * Tickets + PRD + Ralph Namespace Builders
 *
 * Builds the `tickets`, `prd`, and `ralph` namespaces for the preload API.
 */

import { ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipcContracts'
import { safeInvoke } from '../safeInvoke'
import type { ElectronAPI } from '../types'
import type { Ticket } from '../../shared/types'

export function buildTicketsAPI(): ElectronAPI['tickets'] {
  return {
    getAll: () => safeInvoke(IPC_CHANNELS.TICKET_GET_ALL) as Promise<Ticket[]>,
    create: (request) =>
      safeInvoke(IPC_CHANNELS.TICKET_CREATE, request) as Promise<Ticket>,
    update: (request) =>
      safeInvoke(IPC_CHANNELS.TICKET_UPDATE, request) as Promise<void>,
    delete: (id) => safeInvoke(IPC_CHANNELS.TICKET_DELETE, id) as Promise<void>,
    transition: (request) =>
      safeInvoke(IPC_CHANNELS.TICKET_TRANSITION, request) as Promise<void>,
    reorder: (request) =>
      safeInvoke(IPC_CHANNELS.TICKET_REORDER, request) as Promise<Ticket[]>,
    openAsProject: (request) =>
      safeInvoke(IPC_CHANNELS.TICKET_OPEN_AS_PROJECT, request) as ReturnType<ElectronAPI['tickets']['openAsProject']>,
    onStatusChanged: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, ticket: Ticket) => {
        callback(ticket)
      }
      ipcRenderer.on('ticket:status-changed', listener)
      return () => {
        ipcRenderer.removeListener('ticket:status-changed', listener)
      }
    },
  }
}

export function buildPrdAPI(): ElectronAPI['prd'] {
  return {
    generate: (request) =>
      safeInvoke(IPC_CHANNELS.PRD_GENERATE, request) as ReturnType<ElectronAPI['prd']['generate']>,
    approve: (request) =>
      safeInvoke(IPC_CHANNELS.PRD_APPROVE, request) as Promise<void>,
    reject: (request) =>
      safeInvoke(IPC_CHANNELS.PRD_REJECT, request) as Promise<void>,
  }
}

export function buildRalphAPI(): ElectronAPI['ralph'] {
  return {
    execute: (request) =>
      safeInvoke(IPC_CHANNELS.RALPH_EXECUTE, request) as Promise<void>,
    getStatus: (request) =>
      safeInvoke(IPC_CHANNELS.RALPH_STATUS, request) as ReturnType<ElectronAPI['ralph']['getStatus']>,
    stop: (request) =>
      safeInvoke(IPC_CHANNELS.RALPH_STOP, request) as Promise<void>,
    chooseWorktreeDir: () =>
      safeInvoke(IPC_CHANNELS.RALPH_CHOOSE_WORKTREE_DIR) as Promise<string | null>,
    onStatusChanged: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { ticketId: string; running: boolean; iteration: number },
      ) => {
        callback(data)
      }
      ipcRenderer.on('ralph:status-changed', listener)
      return () => {
        ipcRenderer.removeListener('ralph:status-changed', listener)
      }
    },
  }
}
