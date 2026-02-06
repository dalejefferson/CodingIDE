/**
 * Command completion detection for the Terminal Service.
 *
 * Detects when a shell command finishes by watching for prompt patterns
 * in PTY output. Fires a callback when the busy→idle transition occurs
 * after a minimum duration threshold.
 */

import type { CommandCompletionEvent } from '@shared/types'

/**
 * Minimum command duration (ms) before firing a completion event.
 * Very fast commands (e.g. pressing Enter on an empty prompt) are
 * suppressed to avoid notification noise.
 */
export const MIN_COMMAND_DURATION_MS = 500

/**
 * Shell prompt heuristic: matches common trailing prompt characters.
 * Strips ANSI escape codes first, then looks for a line ending with
 * `$`, `%`, `>`, or `#` followed by optional whitespace.
 */
export const PROMPT_RE = /[$%>#]\s*$/

/** Strip ANSI escape sequences from a string for prompt detection */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
}

export type CommandDoneCallback = (event: CommandCompletionEvent) => void

/** Minimal shape required from a terminal instance for busy-flag tracking */
export interface CommandTrackingState {
  busy: boolean
  busySince: number
  projectId: string
}

/**
 * Detect shell prompt in PTY output. When a busy terminal outputs a line
 * matching common prompt patterns, we infer the previous command completed.
 *
 * @returns true if a command completion was detected and the callback was invoked
 */
export function detectPrompt(
  terminalId: string,
  instance: CommandTrackingState,
  data: string,
  callback: CommandDoneCallback | null,
): boolean {
  if (!instance.busy) return false

  const cleaned = stripAnsi(data)
  if (!PROMPT_RE.test(cleaned)) return false

  const elapsed = Date.now() - instance.busySince
  instance.busy = false

  if (elapsed < MIN_COMMAND_DURATION_MS) return false

  callback?.({
    terminalId,
    projectId: instance.projectId,
    elapsedMs: elapsed,
  })

  return true
}
