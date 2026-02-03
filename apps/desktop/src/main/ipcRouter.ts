import { ipcMain, BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IPCChannel, IPCContracts } from '../shared/ipcContracts'
import { isAllowedChannel, validatePayload } from '../shared/ipcContracts'

export type IPCHandler<T extends IPCChannel> = (
  event: IpcMainInvokeEvent,
  payload: IPCContracts[T]['request'],
) => Promise<IPCContracts[T]['response']> | IPCContracts[T]['response']

/**
 * Validated IPC router for the main process.
 *
 * Every incoming invoke passes through three gates:
 *   1. Channel allowlist — rejects channels not declared in IPC_CHANNELS
 *   2. Sender verification — rejects calls from unknown or destroyed windows
 *   3. Payload validation — rejects payloads that fail the channel's validator
 */
export class IPCRouter {
  private registered = new Set<string>()

  handle<T extends IPCChannel>(channel: T, handler: IPCHandler<T>): void {
    if (this.registered.has(channel)) {
      throw new Error(`IPC: duplicate handler for "${channel}"`)
    }

    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, payload: unknown) => {
      // Gate 1: channel allowlist (defense-in-depth — already typed at call site)
      if (!isAllowedChannel(channel)) {
        throw new Error(`IPC rejected: unknown channel "${channel}"`)
      }

      // Gate 2: sender must be a known, live BrowserWindow
      const sender = BrowserWindow.fromWebContents(event.sender)
      if (!sender || sender.isDestroyed()) {
        throw new Error(`IPC rejected: unknown sender on "${channel}"`)
      }

      // Gate 3: payload must pass the channel's runtime validator
      if (!validatePayload(channel, payload)) {
        throw new Error(`IPC rejected: invalid payload on "${channel}" (got ${typeof payload})`)
      }

      return handler(event, payload as IPCContracts[T]['request'])
    })

    this.registered.add(channel)
  }

  /** Remove all registered handlers */
  dispose(): void {
    for (const channel of this.registered) {
      ipcMain.removeHandler(channel)
    }
    this.registered.clear()
  }
}
