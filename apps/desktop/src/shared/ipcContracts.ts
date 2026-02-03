/**
 * IPC Contract Definitions — Single Source of Truth
 *
 * Every IPC channel must be declared here with:
 * 1. Channel constant (IPC_CHANNELS)
 * 2. Type contract (IPCContracts)
 * 3. Runtime validator (IPC_VALIDATORS)
 *
 * Validation approach: manual type guards (zero dependencies).
 * Rationale: all current payloads are void — manual guards are trivially
 * correct and keep the bundle small. Switch to zod when payloads grow
 * complex enough to warrant a schema library.
 */

// ── Channel Constants ──────────────────────────────────────────

export const IPC_CHANNELS = {
  PING: 'ipc:ping',
  GET_APP_VERSION: 'ipc:get-app-version',
  WINDOW_MINIMIZE: 'ipc:window-minimize',
  WINDOW_MAXIMIZE: 'ipc:window-maximize',
  WINDOW_CLOSE: 'ipc:window-close',
} as const

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/** Frozen set of all allowed channels — used for allowlist checks */
export const ALLOWED_CHANNELS: ReadonlySet<string> = new Set<string>(Object.values(IPC_CHANNELS))

// ── Type Contracts ─────────────────────────────────────────────

export interface IPCContracts {
  [IPC_CHANNELS.PING]: {
    request: void
    response: string
  }
  [IPC_CHANNELS.GET_APP_VERSION]: {
    request: void
    response: string
  }
  [IPC_CHANNELS.WINDOW_MINIMIZE]: {
    request: void
    response: void
  }
  [IPC_CHANNELS.WINDOW_MAXIMIZE]: {
    request: void
    response: void
  }
  [IPC_CHANNELS.WINDOW_CLOSE]: {
    request: void
    response: void
  }
}

// ── Runtime Validators ─────────────────────────────────────────

export type PayloadValidator = (payload: unknown) => boolean

/** Payload must be undefined (no arguments expected) */
export function isVoid(payload: unknown): boolean {
  return payload === undefined
}

/** Payload must be a string */
export function isString(payload: unknown): boolean {
  return typeof payload === 'string'
}

/** Payload must be a non-empty string */
export function isNonEmptyString(payload: unknown): boolean {
  return typeof payload === 'string' && payload.length > 0
}

/**
 * Validator registry — exactly one validator per channel.
 * Adding a channel without a validator is a compile error.
 */
export const IPC_VALIDATORS: Record<IPCChannel, PayloadValidator> = {
  [IPC_CHANNELS.PING]: isVoid,
  [IPC_CHANNELS.GET_APP_VERSION]: isVoid,
  [IPC_CHANNELS.WINDOW_MINIMIZE]: isVoid,
  [IPC_CHANNELS.WINDOW_MAXIMIZE]: isVoid,
  [IPC_CHANNELS.WINDOW_CLOSE]: isVoid,
}

// ── Validation Helpers ─────────────────────────────────────────

/** Check if a channel string is in the allowlist */
export function isAllowedChannel(channel: string): channel is IPCChannel {
  return ALLOWED_CHANNELS.has(channel)
}

/** Validate a payload against the channel's registered validator */
export function validatePayload(channel: IPCChannel, payload: unknown): boolean {
  return IPC_VALIDATORS[channel](payload)
}
