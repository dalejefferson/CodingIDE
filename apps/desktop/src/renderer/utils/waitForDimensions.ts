/**
 * waitForDimensions — resolves when an element has non-zero width AND height.
 *
 * Uses a temporary ResizeObserver that disconnects as soon as both
 * dimensions are positive. Falls back to resolve after `timeoutMs` to
 * prevent indefinite hangs if the element is permanently hidden.
 */

const DEFAULT_TIMEOUT_MS = 2000

export function waitForDimensions(
  el: HTMLElement,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<{ width: number; height: number }> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const signal = opts?.signal

  // Fast path: already has dimensions (common for single-pane layouts)
  const { offsetWidth: w, offsetHeight: h } = el
  if (w > 0 && h > 0) return Promise.resolve({ width: w, height: h })

  // Already aborted
  if (signal?.aborted) return Promise.resolve({ width: 0, height: 0 })

  return new Promise((resolve) => {
    const cleanup = () => {
      observer.disconnect()
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    const onAbort = () => {
      cleanup()
      resolve({ width: 0, height: 0 })
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          cleanup()
          resolve({ width, height })
          return
        }
      }
    })

    observer.observe(el)

    if (signal) signal.addEventListener('abort', onAbort, { once: true })

    // Safety valve: resolve with current dimensions after timeout.
    // If still 0x0, the caller's fallback logic (cols >= 10 check) handles it.
    const timer = setTimeout(() => {
      cleanup()
      resolve({ width: el.offsetWidth, height: el.offsetHeight })
    }, timeoutMs)
  })
}

/**
 * pollForDimensions — rAF-based poll that resolves `true` once `el`
 * has non-zero width AND height.
 *
 * Used as a fallback when `waitForDimensions` resolves 0x0 (e.g.
 * split panes mounting while flex layout is still computing).
 * Resolves `false` on abort or after `maxMs`.
 */
export function pollForDimensions(
  el: HTMLElement,
  signal: AbortSignal,
  maxMs = 3000,
): Promise<boolean> {
  if (el.offsetWidth > 0 && el.offsetHeight > 0) return Promise.resolve(true)
  if (signal.aborted) return Promise.resolve(false)

  return new Promise((resolve) => {
    const start = Date.now()
    let rafId = 0

    const onAbort = () => {
      cancelAnimationFrame(rafId)
      resolve(false)
    }
    signal.addEventListener('abort', onAbort, { once: true })

    const check = () => {
      if (signal.aborted) return
      if (el.offsetWidth > 0 && el.offsetHeight > 0) {
        signal.removeEventListener('abort', onAbort)
        resolve(true)
        return
      }
      if (Date.now() - start > maxMs) {
        signal.removeEventListener('abort', onAbort)
        resolve(false)
        return
      }
      rafId = requestAnimationFrame(check)
    }
    rafId = requestAnimationFrame(check)
  })
}
