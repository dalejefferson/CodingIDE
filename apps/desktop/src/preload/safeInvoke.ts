/**
 * Safe IPC Invocation + Terminal Data Routing
 *
 * Provides the safeInvoke helper (allowlist-gated ipcRenderer.invoke)
 * and the global terminal data listener that dispatches to per-terminal
 * subscriber sets.
 */

import { ipcRenderer } from 'electron'
import { ALLOWED_CHANNELS } from '../shared/ipcContracts'

/**
 * Per-terminal data routing — one global IPC listener dispatches to
 * per-terminalId subscriber sets, so N panes never means N global listeners.
 */
export const dataSubscribers = new Map<string, Set<(data: string) => void>>()

ipcRenderer.on(
  'terminal:data',
  (_event: Electron.IpcRendererEvent, terminalId: string, data: string) => {
    const subs = dataSubscribers.get(terminalId)
    if (subs) {
      for (const cb of subs) cb(data)
    }
  },
)

/** Only invoke channels that exist in the allowlist */
export function safeInvoke(channel: string, ...args: unknown[]): Promise<unknown> {
  if (!ALLOWED_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`IPC channel not allowed: ${channel}`))
  }
  return ipcRenderer.invoke(channel, ...args)
}
