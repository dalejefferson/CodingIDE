/**
 * Kanban Ticket IPC Handlers
 *
 * Registers handlers for ticket CRUD, status transitions,
 * and drag-and-drop reordering.
 */

import { IPC_CHANNELS } from '../shared/ipcContracts'
import type { IPCRouter } from './ipcRouter'
import type { TicketStore } from '@services/ticketStore'

export function setupTicketIPC(router: IPCRouter, ticketStore: TicketStore): void {
  router.handle(IPC_CHANNELS.TICKET_GET_ALL, () => {
    return ticketStore.getAll()
  })

  router.handle(IPC_CHANNELS.TICKET_CREATE, (_event, payload) => {
    return ticketStore.create(payload)
  })

  router.handle(IPC_CHANNELS.TICKET_UPDATE, (_event, payload) => {
    ticketStore.update(payload.id, payload)
  })

  router.handle(IPC_CHANNELS.TICKET_DELETE, (_event, payload) => {
    ticketStore.delete(payload)
  })

  router.handle(IPC_CHANNELS.TICKET_TRANSITION, (_event, payload) => {
    ticketStore.transition(payload.id, payload.status)
  })

  router.handle(IPC_CHANNELS.TICKET_REORDER, (_event, payload) => {
    return ticketStore.reorder(payload.id, payload.status, payload.index)
  })
}
