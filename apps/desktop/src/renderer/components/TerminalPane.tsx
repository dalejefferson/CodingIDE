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
import { WebLinksAddon } from '@xterm/addon-web-links'
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
  pendingCommand?: string
  onFocus: () => void
  onCommandSent?: () => void
}

/** Palette-aware terminal theme — reads CSS custom properties from the active palette. */
function getXtermTheme(): Record<string, string> {
  const style = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    background: v('--terminal-bg', '#1c2128'),
    foreground: v('--terminal-fg', '#d4dae0'),
    cursor: v('--color-accent', '#ff9b51'),
    cursorAccent: v('--terminal-cursor-accent', '#1c2128'),
    selectionBackground: v('--terminal-selection-bg', 'rgba(255, 155, 81, 0.22)'),
    selectionForeground: v('--terminal-selection-fg', '#f0f0f4'),
  }
}

export function TerminalPane({
  terminalId,
  projectId,
  cwd,
  isActive,
  palette,
  pendingCommand,
  onFocus,
  onCommandSent,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const pendingCommandRef = useRef(pendingCommand)
  const onCommandSentRef = useRef(onCommandSent)
  const [currentCwd, setCurrentCwd] = useState(cwd)
  const [gitBranch, setGitBranch] = useState<string | null>(null)

  // Keep refs in sync
  pendingCommandRef.current = pendingCommand
  onCommandSentRef.current = onCommandSent

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

    // Clickable links — opens in default browser
    term.loadAddon(
      new WebLinksAddon(
        (_event, url) => {
          window.electronAPI.shell.openExternal(url)
        },
        {
          hover: (_event, text, location) => {
            // xterm renders underline decoration automatically via the link provider
            void text
            void location
          },
        },
      ),
    )

    // Also register via the terminal's link provider for Cmd+Click support
    term.registerLinkProvider({
      provideLinks(bufferLineNumber, callback) {
        const line = term.buffer.active.getLine(bufferLineNumber)
        if (!line) return callback(undefined)
        const text = line.translateToString()
        const urlRe = /https?:\/\/[^\s'"\]>)]+/g
        const links: {
          range: { start: { x: number; y: number }; end: { x: number; y: number } }
          text: string
          activate: (_event: MouseEvent, linkText: string) => void
        }[] = []
        let match: RegExpExecArray | null
        while ((match = urlRe.exec(text)) !== null) {
          links.push({
            range: {
              start: { x: match.index + 1, y: bufferLineNumber + 1 },
              end: { x: match.index + match[0].length + 1, y: bufferLineNumber + 1 },
            },
            text: match[0],
            activate: (_event, linkText) => {
              window.electronAPI.shell.openExternal(linkText)
            },
          })
        }
        callback(links.length > 0 ? links : undefined)
      },
    })

    // Let Shift+Tab bubble to the global handler (project cycling)
    // instead of being consumed by xterm as terminal input.
    term.attachCustomKeyEventHandler((e) => {
      if (e.shiftKey && e.key === 'Tab') return false
      return true
    })

    termRef.current = term
    fitRef.current = fitAddon

    // Guard against writes after disposal
    let disposed = false

    // Queue live data until buffer replay finishes to avoid duplicates
    let replayDone = false
    const pendingData: string[] = []

    // Forward keystrokes to PTY
    const onDataDispose = term.onData((data) => {
      window.electronAPI.terminal.write({ terminalId, data })
    })

    // Receive PTY output — queue until replay finishes, then write live
    const removeDataListener = window.electronAPI.terminal.onData((id, data) => {
      if (id !== terminalId || disposed) return
      if (replayDone) {
        term.write(data)
        const newCwd = extractOsc7Cwd(data)
        if (newCwd) setCurrentCwd(newCwd)
      } else {
        pendingData.push(data)
      }
    })

    // Wait two frames so the container has a layout-computed size before fitting
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (disposed) return
        fitAddon.fit()

        const cols = term.cols >= 10 ? term.cols : 80
        const rows = term.rows >= 2 ? term.rows : 24
        window.electronAPI.terminal
          .create({
            projectId,
            terminalId,
            cwd,
            cols,
            rows,
          })
          .then(() => window.electronAPI.terminal.getBuffer(terminalId))
          .then((buffer) => {
            if (disposed) return
            // Replay scrollback buffer (restores output from before project switch)
            if (buffer) {
              term.write(buffer)
              const cwdFromBuffer = extractOsc7Cwd(buffer)
              if (cwdFromBuffer) setCurrentCwd(cwdFromBuffer)
            }
            // The buffer already contains everything the PTY emitted up to
            // the getBuffer() snapshot. Any live data that arrived in the
            // meantime is a duplicate — discard it and just start writing
            // live from this point forward.
            replayDone = true
            pendingData.length = 0

            // If a command was queued (e.g. from the play button), send it
            // after a brief delay so the shell prompt is ready.
            if (pendingCommandRef.current) {
              const cmd = pendingCommandRef.current
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
    })

    // Handle resize — debounce via rAF and guard against disposed state.
    // Enforce minimum 10 cols / 2 rows to prevent staircase rendering when
    // the container briefly collapses during layout transitions.
    let resizeRaf = 0
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        if (disposed) return
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
      onDataDispose.dispose()
      removeDataListener()
      cancelAnimationFrame(resizeRaf)
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
