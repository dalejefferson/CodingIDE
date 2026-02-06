/**
 * useLocalhostDetection — encapsulates the collection-window strategy
 * for detecting localhost dev-server URLs in terminal output.
 *
 * The terminal writes raw PTY data into a rolling buffer. This hook
 * scans the buffer for localhost URLs, classifies each URL (dev / api /
 * ambiguous), and fires the callback with the best candidate after a
 * 3-second collection window.  Definite dev-server URLs fire immediately.
 */

import { useRef, useCallback, useMemo } from 'react'
import {
  stripAnsi,
  LOCALHOST_RE,
  extractPort,
  classifyServerUrl,
  pickBestUrl,
} from './terminalUtils'
import type { CollectedUrl } from './terminalUtils'

interface UseLocalhostDetectionOptions {
  onLocalhostDetected?: (url: string) => void
}

const COLLECTION_WINDOW_MS = 3000

export function useLocalhostDetection({ onLocalhostDetected }: UseLocalhostDetectionOptions) {
  const firedRef = useRef(false)
  const seenUrlsRef = useRef<Set<string>>(new Set())
  const bufferRef = useRef('')
  const suppressUntilRef = useRef(0)
  const collectedRef = useRef<CollectedUrl[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(onLocalhostDetected)
  callbackRef.current = onLocalhostDetected

  /** Flush the collection window — pick the best URL and fire the callback. */
  const flush = useCallback(() => {
    timerRef.current = null
    if (firedRef.current || !callbackRef.current) return
    const collected = collectedRef.current
    if (collected.length === 0) return

    const best = pickBestUrl(collected)
    if (best) {
      firedRef.current = true
      callbackRef.current(best)
    }
    collected.length = 0
  }, [])

  /** Reset all detection state (call when a new terminal session starts). */
  const reset = useCallback(() => {
    firedRef.current = false
    seenUrlsRef.current.clear()
    bufferRef.current = ''
    suppressUntilRef.current = 0
    collectedRef.current.length = 0
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /** Suppress detection for `ms` milliseconds (used after PTY reconnection). */
  const suppress = useCallback((ms: number) => {
    suppressUntilRef.current = Date.now() + ms
  }, [])

  /** Feed new PTY data into the detection buffer. */
  const feed = useCallback(
    (data: string) => {
      if (firedRef.current || !callbackRef.current) return
      if (Date.now() < suppressUntilRef.current) return

      bufferRef.current += data
      if (bufferRef.current.length > 2048) {
        bufferRef.current = bufferRef.current.slice(-2048)
      }

      const clean = stripAnsi(bufferRef.current)
      LOCALHOST_RE.lastIndex = 0
      let match: RegExpExecArray | null
      const collected = collectedRef.current

      while ((match = LOCALHOST_RE.exec(clean)) !== null) {
        const url = match[0].replace(/[.,;:]+$/, '')
        if (seenUrlsRef.current.has(url)) continue
        seenUrlsRef.current.add(url)

        const ctxStart = Math.max(0, match.index - 300)
        const ctxEnd = Math.min(clean.length, match.index + match[0].length + 300)
        const context = clean.slice(ctxStart, ctxEnd)

        const classification = classifyServerUrl(context)
        const port = extractPort(url)
        collected.push({ url, classification, port })

        // Definite dev server -> fire immediately
        if (classification === 'dev') {
          if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
          }
          firedRef.current = true
          callbackRef.current!(url)
          break
        }

        // Ambiguous or API — start/reset collection window
        if (!timerRef.current) {
          timerRef.current = setTimeout(flush, COLLECTION_WINDOW_MS)
        }
      }
    },
    [flush],
  )

  /** Clean up any pending timer (call in effect cleanup). */
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return useMemo(
    () => ({ feed, reset, suppress, cleanup, firedRef }),
    [feed, reset, suppress, cleanup],
  )
}
