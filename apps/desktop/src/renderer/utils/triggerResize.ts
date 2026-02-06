/**
 * Debounced resize event dispatcher.
 *
 * Multiple parts of the app fire window resize events after layout
 * transitions (sidebar toggle, view mode switch, visibility change).
 * Without debouncing, these can stack and cause redundant reflows
 * in every ResizeObserver and xterm FitAddon.
 *
 * When called multiple times, the latest (longest) deadline wins —
 * a short 220ms call won't cancel a pending 350ms call that was
 * scheduled to fire after a CSS transition completes.
 */

let pending: ReturnType<typeof setTimeout> | null = null
let pendingFireAt = 0

export function triggerResize(delayMs = 220): void {
  const fireAt = Date.now() + delayMs

  // If a pending timer already fires later, keep it
  if (pending && pendingFireAt >= fireAt) return

  if (pending) clearTimeout(pending)
  pendingFireAt = fireAt
  pending = setTimeout(() => {
    window.dispatchEvent(new Event('resize'))
    pending = null
    pendingFireAt = 0
  }, delayMs)
}
