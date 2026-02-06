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
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { extractOsc7Cwd } from '@shared/osc7Parser'
import { PaneInputBar } from './PaneInputBar'
import { AiProcessingOverlay } from './AiProcessingOverlay'
import { getXtermTheme, setupTerminalLinks } from './terminalUtils'
import { useLocalhostDetection } from './useLocalhostDetection'
import { useTerminalResize } from './useTerminalResize'

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
  const [gitBranch, setGitBranch] = useState<string | null>(null)
  const [aiProcessing, setAiProcessing] = useState(false)

  // Keep refs in sync
  pendingCommandRef.current = pendingCommand
  onCommandSentRef.current = onCommandSent

  const localhost = useLocalhostDetection({ onLocalhostDetected })
  const resize = useTerminalResize()

  // Send command from input bar to PTY
  const handleSendCommand = useCallback(
    (command: string) => {
      window.electronAPI.terminal.write({ terminalId, data: command + '\n' })
    },
    [terminalId],
  )

  // Route localhost URLs to embedded browser, others to system browser
  const handleLinkClick = useCallback((url: string) => {
    if (/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)/i.test(url)) {
      window.dispatchEvent(new CustomEvent('browser:navigate', { detail: url }))
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

    // Wait two frames for layout then create PTY
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (disposed) return
        fitAddon.fit()

        const cols = term.cols >= 10 ? term.cols : 80
        const rows = term.rows >= 2 ? term.rows : 24
        window.electronAPI.terminal
          .create({ projectId, terminalId, cwd, cols, rows })
          .then(({ created }) => {
            if (disposed) return
            resize.suppressFor(500)

            setTimeout(() => {
              if (disposed) return
              fitAddon.fit()
              const { cols: c, rows: r } = term
              if (c >= 10 && r >= 2) {
                window.electronAPI.terminal.resize({ terminalId, cols: c, rows: r })
              }
            }, 550)

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
    })

    const cleanupResize = resize.observe(container, term, fitAddon, terminalId)

    return () => {
      disposed = true
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

  // Poll git branch
  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    async function fetchBranch() {
      try {
        const result = await window.electronAPI.git.getBranch({ cwd: currentCwd })
        if (!cancelled) setGitBranch(result.branch)
      } catch {
        if (!cancelled) setGitBranch(null)
      }
    }
    fetchBranch()
    const interval = setInterval(fetchBranch, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [currentCwd, isActive])

  return (
    <div className={`terminal-pane${isActive ? ' terminal-pane--active' : ''}`} onClick={onFocus}>
      <div ref={containerRef} className="terminal-pane-xterm" onClick={handleXtermClick} />
      {aiProcessing && <AiProcessingOverlay />}
      <PaneInputBar cwd={currentCwd} gitBranch={gitBranch} onSendCommand={handleSendCommand} />
    </div>
  )
}

export const TerminalPane = React.memo(TerminalPaneInner)
