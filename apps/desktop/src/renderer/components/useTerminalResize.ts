/**
 * useTerminalResize — encapsulates ResizeObserver + CSS transition
 * awareness for an xterm.js terminal container.
 *
 * During CSS transitions on ancestor layout elements (flex-basis, height,
 * width), fitting xterm causes staircase rendering because the container
 * size is changing frame-by-frame. This hook suppresses fitting while
 * ancestors are animating and performs a single fit once the transition
 * completes.
 *
 * Also supports a post-creation suppression window to avoid SIGWINCH
 * double-prompts when the PTY was just created with the correct dims.
 */

import { useRef, useCallback, useMemo } from 'react'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'

export interface TerminalResizeController {
  /** Start observing the container. Returns a cleanup function. */
  observe: (
    container: HTMLDivElement,
    term: Terminal,
    fitAddon: FitAddon,
    terminalId: string,
  ) => () => void
  /** Suppress resize-triggered fits until Date.now() + ms. */
  suppressFor: (ms: number) => void
}

export function useTerminalResize(): TerminalResizeController {
  const suppressUntilRef = useRef(0)

  const suppressFor = useCallback((ms: number) => {
    suppressUntilRef.current = Date.now() + ms
  }, [])

  const observe = useCallback(
    (
      container: HTMLDivElement,
      term: Terminal,
      fitAddon: FitAddon,
      terminalId: string,
    ): (() => void) => {
      let disposed = false
      let resizeRaf = 0
      let transitionCount = 0

      const isAncestorTransition = (e: TransitionEvent) => {
        const prop = e.propertyName
        if (prop !== 'flex-basis' && prop !== 'height' && prop !== 'width') return false
        const target = e.target as Element | null
        return target != null && target.contains(container)
      }

      const handleTransitionStart = (e: TransitionEvent) => {
        if (isAncestorTransition(e)) transitionCount++
      }

      const handleTransitionEnd = (e: TransitionEvent) => {
        if (!isAncestorTransition(e)) return
        transitionCount = Math.max(0, transitionCount - 1)
        if (transitionCount === 0 && !disposed) {
          requestAnimationFrame(() => {
            if (disposed) return
            fitAddon.fit()
            const { cols, rows } = term
            if (cols >= 10 && rows >= 2) {
              window.electronAPI.terminal.resize({ terminalId, cols, rows })
            }
          })
        }
      }

      document.addEventListener('transitionstart', handleTransitionStart, true)
      document.addEventListener('transitionend', handleTransitionEnd, true)
      document.addEventListener('transitioncancel', handleTransitionEnd, true)

      const resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(resizeRaf)
        resizeRaf = requestAnimationFrame(() => {
          if (disposed) return
          if (transitionCount > 0) return
          if (Date.now() < suppressUntilRef.current) return
          fitAddon.fit()
          const { cols, rows } = term
          if (cols >= 10 && rows >= 2) {
            window.electronAPI.terminal.resize({ terminalId, cols, rows })
          }
        })
      })
      resizeObserver.observe(container)

      return () => {
        disposed = true
        cancelAnimationFrame(resizeRaf)
        resizeObserver.disconnect()
        document.removeEventListener('transitionstart', handleTransitionStart, true)
        document.removeEventListener('transitionend', handleTransitionEnd, true)
        document.removeEventListener('transitioncancel', handleTransitionEnd, true)
      }
    },
    [],
  )

  return useMemo(() => ({ observe, suppressFor }), [observe, suppressFor])
}
