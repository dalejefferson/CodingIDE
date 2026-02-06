/**
 * Port Service IPC Handlers
 *
 * Registers handlers for OS-level port checking, sequential port
 * scanning, and the in-memory port ownership registry.
 */

import { IPC_CHANNELS } from '../shared/ipcContracts'
import {
  isPortInUse,
  findAvailablePort,
  registerPort,
  unregisterPort,
  getPortOwner,
} from '@services/portService'
import type { IPCRouter } from './ipcRouter'

export function setupPortIPC(router: IPCRouter): void {
  router.handle(IPC_CHANNELS.PORT_CHECK, async (_event, payload) => {
    const inUse = await isPortInUse(payload.port)
    return { inUse }
  })

  router.handle(IPC_CHANNELS.PORT_FIND_AVAILABLE, async (_event, payload) => {
    const port = await findAvailablePort(payload.basePort)
    return { port }
  })

  router.handle(IPC_CHANNELS.PORT_REGISTER, (_event, payload) => {
    registerPort(payload.projectId, payload.port)
  })

  router.handle(IPC_CHANNELS.PORT_UNREGISTER, (_event, payload) => {
    unregisterPort(payload.projectId, payload.port)
  })

  router.handle(IPC_CHANNELS.PORT_GET_OWNER, (_event, payload) => {
    return { projectId: getPortOwner(payload.port) }
  })
}
