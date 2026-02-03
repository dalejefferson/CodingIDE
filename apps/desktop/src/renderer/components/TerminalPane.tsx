/**
 * TerminalPane — 3-zone terminal layout: header / xterm / input bar.
 *
 * Handles:
 *   - xterm.js lifecycle (init, dispose)
 *   - Fit addon for responsive resizing
 *   - Data flow: keystrokes → IPC → PTY, PTY output → IPC → xterm
 *   - OSC 7 CWD tracking
 *   - Git branch polling
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import { extractOsc7Cwd } from '@shared/osc7Parser'
import { PaneHeader } from './PaneHeader'
import { PaneInputBar } from './PaneInputBar'

interface TerminalPaneProps {
  terminalId: string
  projectId: string
  cwd: string
  isActive: boolean
  palette: string
  onFocus: () => void
}

/** Read computed CSS custom properties and return an xterm.js-compatible theme object. */
function getXtermTheme(): Record<string, string> {
  const style = getComputedStyle(document.documentElement)
  const get = (prop: string) => style.getPropertyValue(prop).trim()
  return {
    background: 'transparent',
    foreground: get('--color-text-primary'),
    cursor: get('--color-accent'),
    cursorAccent: get('--color-bg-primary'),
    selectionBackground: get('--color-accent-subtle') || 'rgba(255,255,255,0.2)',
    selectionForeground: get('--color-text-primary'),
  }
}

export function TerminalPane({
  terminalId,
  projectId,
  cwd,
  isActive,
  palette,
  onFocus,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const [currentCwd, setCurrentCwd] = useState(cwd)
  const [gitBranch, setGitBranch] = useState<string | null>(null)

  // Send command from input bar to PTY
  const handleSendCommand = useCallback(
    (command: string) => {
      window.electronAPI.terminal.write({ terminalId, data: command + '\n' })
    },
    [terminalId],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const term = new Terminal({
      fontSize: 13,
      fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Cascadia Code', 'Consolas', monospace",
      cursorBlink: true,
      scrollback: 5000,
      allowTransparency: true,
      drawBoldTextInBrightColors: true,
      fontWeight: '400',
      fontWeightBold: '600',
      letterSpacing: 0,
      lineHeight: 1.2,
      theme: {
        background: 'transparent',
      },
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(container)
    term.options.theme = getXtermTheme()

    // Load WebGL renderer for crisp, GPU-accelerated text
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      term.loadAddon(webglAddon)
    } catch {
      // WebGL not available — falls back to canvas renderer
      console.warn('WebGL addon failed to load, using canvas renderer')
    }

    termRef.current = term
    fitRef.current = fitAddon

    // Queue live data until buffer replay finishes to avoid duplicates
    let replayDone = false
    const pendingData: string[] = []

    // Forward keystrokes to PTY
    const onDataDispose = term.onData((data) => {
      window.electronAPI.terminal.write({ terminalId, data })
    })

    // Receive PTY output — queue until replay finishes, then write live
    const removeDataListener = window.electronAPI.terminal.onData((id, data) => {
      if (id !== terminalId) return
      if (replayDone) {
        term.write(data)
        const newCwd = extractOsc7Cwd(data)
        if (newCwd) setCurrentCwd(newCwd)
      } else {
        pendingData.push(data)
      }
    })

    // Fit to container after mount, then create/reconnect PTY
    requestAnimationFrame(() => {
      fitAddon.fit()

      const { cols, rows } = term
      window.electronAPI.terminal
        .create({
          projectId,
          terminalId,
          cwd,
          cols: cols > 0 ? cols : 80,
          rows: rows > 0 ? rows : 24,
        })
        .then(() => window.electronAPI.terminal.getBuffer(terminalId))
        .then((buffer) => {
          // Replay scrollback buffer (restores output from before project switch)
          if (buffer) {
            term.write(buffer)
            const cwdFromBuffer = extractOsc7Cwd(buffer)
            if (cwdFromBuffer) setCurrentCwd(cwdFromBuffer)
          }
          // Flush any data that arrived during replay
          replayDone = true
          for (const data of pendingData) {
            term.write(data)
            const newCwd = extractOsc7Cwd(data)
            if (newCwd) setCurrentCwd(newCwd)
          }
          pendingData.length = 0
        })
        .catch((err: unknown) => {
          console.error('Failed to create/reconnect PTY:', err)
          replayDone = true
        })
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit()
        const { cols, rows } = term
        window.electronAPI.terminal.resize({ terminalId, cols, rows })
      })
    })
    resizeObserver.observe(container)

    return () => {
      onDataDispose.dispose()
      removeDataListener()
      resizeObserver.disconnect()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [terminalId, projectId, cwd])

  // Update xterm colors when palette changes
  useEffect(() => {
    if (!termRef.current) return
    // Small delay to let CSS variables settle after data-theme change
    const raf = requestAnimationFrame(() => {
      if (termRef.current) {
        termRef.current.options.theme = getXtermTheme()
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [palette])

  // Focus terminal when it becomes active
  useEffect(() => {
    if (isActive && termRef.current) {
      termRef.current.focus()
    }
  }, [isActive])

  // Click on xterm area re-focuses the terminal
  const handleXtermClick = useCallback(() => {
    onFocus()
    termRef.current?.focus()
  }, [onFocus])

  // Poll git branch every 5 seconds
  useEffect(() => {
    let cancelled = false

    async function fetchBranch() {
      try {
        const result = await window.electronAPI.git.getBranch({ cwd: currentCwd })
        if (!cancelled) {
          setGitBranch(result.branch)
        }
      } catch {
        if (!cancelled) setGitBranch(null)
      }
    }

    fetchBranch()
    const interval = setInterval(fetchBranch, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [currentCwd])

  return (
    <div className={`terminal-pane${isActive ? ' terminal-pane--active' : ''}`} onClick={onFocus}>
      <PaneHeader cwd={currentCwd} gitBranch={gitBranch} />
      <div ref={containerRef} className="terminal-pane-xterm" onClick={handleXtermClick} />
      <PaneInputBar onSendCommand={handleSendCommand} />
    </div>
  )
}
