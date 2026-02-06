/**
 * IPC Helper Functions
 *
 * Shared utilities used across IPC handler modules:
 * cached window lookup, renderer messaging, status broadcasting,
 * and shallow equality for change-detection.
 */

import { BrowserWindow } from 'electron'
import type { ProjectStatus, ProjectStatusChange } from '../shared/types'

/** Cached main window reference — avoids BrowserWindow.getAllWindows() on hot paths. */
let cachedMainWindow: BrowserWindow | null = null

/** Get the main renderer window, using a cached reference when possible. */
export function getMainWindow(): BrowserWindow | null {
  if (cachedMainWindow && !cachedMainWindow.isDestroyed()) return cachedMainWindow
  cachedMainWindow = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null
  return cachedMainWindow
}

/** Send a message to the renderer, using the cached window reference. */
export function sendToRenderer(channel: string, ...args: unknown[]): void {
  const win = getMainWindow()
  if (win) win.webContents.send(channel, ...args)
}

/** Shallow equality check for plain objects (string/number values) */
export function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (a[key] !== b[key]) return false
  }
  return true
}

/** Broadcast a project status change to the renderer window */
export function broadcastStatusChange(id: string, status: ProjectStatus): void {
  const change: ProjectStatusChange = { id, status }
  sendToRenderer('project:status-changed', change)
}

/** Clear the cached window reference (used during dispose). */
export function clearCachedMainWindow(): void {
  cachedMainWindow = null
}
