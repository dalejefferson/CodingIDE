import type { BrowserViewMode } from '@shared/types'

/**
 * Typed event bus -- replaces untyped window.dispatchEvent / addEventListener
 * for cross-component communication in the renderer.
 */

export interface ToastDetail {
  kind: 'command' | 'claude' | 'warning' | 'prd'
  projectId: string
  projectName: string
  message?: string
}

interface EventMap {
  'browser:navigate': string
  'browser:set-view-mode': BrowserViewMode
  'sidebar:collapse': void
  'terminal:run-command': string
  'app:show-toast': ToastDetail
  'command-launcher:play': void
}

type Listener<T> = T extends void ? () => void : (data: T) => void

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listeners = new Map<string, Set<(...args: any[]) => void>>()

export function on<K extends keyof EventMap>(
  event: K,
  callback: Listener<EventMap[K]>,
): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(callback)
  return () => {
    listeners.get(event)?.delete(callback)
  }
}

export function emit<K extends keyof EventMap>(
  ...args: EventMap[K] extends void ? [event: K] : [event: K, data: EventMap[K]]
): void {
  const event = args[0]
  const data = args.length > 1 ? args[1] : undefined
  listeners.get(event)?.forEach((fn) => fn(data))
}
