/**
 * TerminalPane — 3-zone terminal layout: header / xterm / input bar.
 *
 * Handles:
 *   - xterm.js lifecycle (init, dispose)
 *   - Fit addon for responsive resizing
 *   - Data flow: keystrokes -> IPC -> PTY, PTY output -> IPC -> xterm
 *   - OSC 7 CWD tracking
 *   - Git branch polling
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { emit } from '../utils/eventBus'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { extractOsc7Cwd } from '@shared/osc7Parser'
import { AiProcessingOverlay } from './AiProcessingOverlay'
import { getXtermTheme, setupTerminalLinks } from './terminalUtils'
import { useLocalhostDetection } from './useLocalhostDetection'
import { useTerminalResize } from './useTerminalResize'
import { waitForDimensions, pollForDimensions } from '../utils/waitForDimensions'

interface TerminalPaneProps {
  terminalId: string
  projectId: string
  cwd: string
  isActive: boolean
  palette: string
  pendingCommand?: string
  onFocus: () => void
  onCommandSent?: () => void
  onLocalhostDetected?: (url: string) => void
}

function TerminalPaneInner({
  terminalId,
  projectId,
  cwd,
  isActive,
  palette,
  pendingCommand,
  onFocus,
  onCommandSent,
  onLocalhostDetected,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const pendingCommandRef = useRef(pendingCommand)
  const onCommandSentRef = useRef(onCommandSent)
  const connectedRef = useRef(false)
  const [currentCwd, setCurrentCwd] = useState(cwd)
  const [aiProcessing, setAiProcessing] = useState(false)

  // Keep refs in sync
  pendingCommandRef.current = pendingCommand
  onCommandSentRef.current = onCommandSent

  const localhost = useLocalhostDetection({ onLocalhostDetected })
  const resize = useTerminalResize()

  // Route localhost URLs to embedded browser, others to system browser
  const handleLinkClick = useCallback((url: string) => {
    console.log('[TerminalPane] handleLinkClick fired:', url)
    if (/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)/i.test(url)) {
      console.log('[TerminalPane] emitting browser:navigate')
      emit('browser:navigate', url)
    } else {
      window.electronAPI.shell.openExternal(url)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const term = new Terminal({
      fontSize: 13,
      fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Cascadia Code', 'Consolas', monospace",
      cursorBlink: true,
      scrollback: 5000,
      allowTransparency: false,
      drawBoldTextInBrightColors: true,
      fontWeight: '400',
      fontWeightBold: '600',
      letterSpacing: 0,
      lineHeight: 1.2,
      theme: getXtermTheme(),
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(container)
    term.options.theme = getXtermTheme()

    let disposed = false

    // WebGL renderer: 3-10x faster rendering for high-throughput terminal output.
    // Loads async after open() so the canvas is attached to the DOM.
    // Falls back silently to the default canvas renderer on context loss or
    // GPU issues (e.g. macOS P3 wide-gamut color space edge cases).
    // NOTE: Disabled by default — enable via settings when GPU compat is confirmed.
    // import('@xterm/addon-webgl')
    //   .then(({ WebglAddon }) => {
    //     if (disposed) return
    //     const webgl = new WebglAddon()
    //     webgl.onContextLoss(() => {
    //       webgl.dispose()
    //     })
    //     term.loadAddon(webgl)
    //   })
    //   .catch(() => {
    //     // Fallback: continue with default canvas renderer
    //   })

    setupTerminalLinks(term, handleLinkClick, () => disposed)

    // Let app-level shortcuts bubble
    term.attachCustomKeyEventHandler((e) => {
      if (e.ctrlKey && e.key === 'Tab') return false
      if (e.metaKey && (e.key === '[' || e.key === ']')) return false
      if ((e.metaKey || e.ctrlKey) && ['p', 'n', 'b', 't', 'f'].includes(e.key)) return false
      return true
    })

    termRef.current = term
    fitRef.current = fitAddon

    let replayDone = false
    const pendingData: string[] = []

    const onDataDispose = term.onData((data) => {
      window.electronAPI.terminal.write({ terminalId, data })
    })

    localhost.reset()

    // Receive PTY output
    const removeDataListener = window.electronAPI.terminal.onData(terminalId, (data) => {
      if (disposed) return
      if (replayDone) {
        term.write(data)
        const newCwd = extractOsc7Cwd(data)
        if (newCwd) setCurrentCwd(newCwd)
        localhost.feed(data)
      } else {
        pendingData.push(data)
      }
    })

    // Wait for container to have non-zero dimensions, then create PTY.
    // A double-RAF was insufficient when multiple panes mount simultaneously
    // because flex layout hadn't computed real sizes within 2 frames.
    const abortCtrl = new AbortController()

    waitForDimensions(container, { signal: abortCtrl.signal }).then(async ({ width, height }) => {
      if (disposed) return

      let hasDimensions = width > 0 && height > 0

      // Split panes may still be 0x0 if flex layout hasn't computed yet.
      // Poll via rAF until the container gets real dimensions.
      if (!hasDimensions) {
        hasDimensions = await pollForDimensions(container, abortCtrl.signal)
        if (disposed) return
      }

      if (hasDimensions) fitAddon.fit()

      const cols = term.cols >= 10 ? term.cols : 80
      const rows = term.rows >= 2 ? term.rows : 24

      return window.electronAPI.terminal
        .create({ projectId, terminalId, cwd, cols, rows })
        .then(({ created }) => {
          if (disposed) return

          // Only suppress ResizeObserver when initial fit used real dimensions.
          // If dimensions were 0x0 (timeout fallback), let the observer correct it.
          if (hasDimensions) resize.suppressFor(300)

          setTimeout(() => {
            if (disposed) return
            fitAddon.fit()
            const { cols: c, rows: r } = term
            if (c >= 10 && r >= 2) {
              window.electronAPI.terminal.resize({ terminalId, cols: c, rows: r })
            }
          }, 350)

          if (created) {
            replayDone = true
            for (const chunk of pendingData) term.write(chunk)
            pendingData.length = 0
            return
          }
          return window.electronAPI.terminal.getBuffer(terminalId)
        })
        .then((buffer) => {
          if (disposed || replayDone) return
          if (buffer) {
            term.write(buffer)
            const cwdFromBuffer = extractOsc7Cwd(buffer)
            if (cwdFromBuffer) setCurrentCwd(cwdFromBuffer)
          }
          replayDone = true
          pendingData.length = 0
          localhost.suppress(2000)
        })
        .then(() => {
          if (disposed) return
          connectedRef.current = true
          if (pendingCommandRef.current) {
            const cmd = pendingCommandRef.current
            if (cmd.startsWith('cc ') && !terminalId.startsWith('drawer-')) {
              setAiProcessing(true)
            }
            setTimeout(() => {
              if (!disposed) {
                window.electronAPI.terminal.write({ terminalId, data: cmd + '\n' })
                onCommandSentRef.current?.()
              }
            }, 300)
          }
        })
        .catch((err: unknown) => {
          console.error('Failed to create/reconnect PTY:', err)
          replayDone = true
        })
    })

    const cleanupResize = resize.observe(container, term, fitAddon, terminalId)

    return () => {
      disposed = true
      abortCtrl.abort()
      connectedRef.current = false
      localhost.cleanup()
      onDataDispose.dispose()
      removeDataListener()
      cleanupResize()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [terminalId, projectId, cwd, handleLinkClick, localhost, resize])

  // Handle late-arriving pendingCommand for an already-connected terminal
  useEffect(() => {
    if (!pendingCommand || !connectedRef.current || !isActive) return
    const cmd = pendingCommand
    if (cmd.startsWith('cc ') && !terminalId.startsWith('drawer-')) {
      setAiProcessing(true)
    }
    const timer = setTimeout(() => {
      window.electronAPI.terminal.write({ terminalId, data: cmd + '\n' })
      onCommandSentRef.current?.()
    }, 300)
    return () => clearTimeout(timer)
  }, [pendingCommand, terminalId, isActive])

  // Update xterm colors when palette changes
  useEffect(() => {
    if (!termRef.current) return
    const raf = requestAnimationFrame(() => {
      if (termRef.current) termRef.current.options.theme = getXtermTheme()
    })
    return () => cancelAnimationFrame(raf)
  }, [palette])

  // Focus terminal when it becomes active
  useEffect(() => {
    if (isActive && termRef.current) termRef.current.focus()
  }, [isActive])

  const handleXtermClick = useCallback(() => {
    onFocus()
    termRef.current?.focus()
  }, [onFocus])

  // Listen for command completion to dismiss AI processing overlay
  useEffect(() => {
    if (!aiProcessing) return
    const removeListener = window.electronAPI.terminal.onCommandDone((event) => {
      if (event.terminalId === terminalId) setAiProcessing(false)
    })
    return removeListener
  }, [aiProcessing, terminalId])


  return (
    <div className={`terminal-pane${isActive ? ' terminal-pane--active' : ''}`} onClick={onFocus}>
      <div ref={containerRef} className="terminal-pane-xterm" onClick={handleXtermClick} />
      {aiProcessing && <AiProcessingOverlay />}
    </div>
  )
}

export const TerminalPane = React.memo(TerminalPaneInner)
