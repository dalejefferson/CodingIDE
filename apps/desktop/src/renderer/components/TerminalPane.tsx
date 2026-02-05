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

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { extractOsc7Cwd } from '@shared/osc7Parser'
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
  onLocalhostDetected?: (url: string) => void
}

/** Standard ANSI colors — fixed across all palettes so terminal text stays readable. */
const ANSI_COLORS = {
  black: '#1d1f21',
  red: '#cc6666',
  green: '#b5bd68',
  yellow: '#f0c674',
  blue: '#81a2be',
  magenta: '#b294bb',
  cyan: '#8abeb7',
  white: '#c5c8c6',
  brightBlack: '#666666',
  brightRed: '#d54e53',
  brightGreen: '#b9ca4a',
  brightYellow: '#e7c547',
  brightBlue: '#7aa6da',
  brightMagenta: '#c397d8',
  brightCyan: '#70c0b1',
  brightWhite: '#eaeaea',
} as const

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
    ...ANSI_COLORS,
  }
}

/** Strip all ANSI escape sequences (CSI, OSC, single-char escapes) */
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  const CSI = /\x1b\[[0-9;?]*[a-zA-Z]/g
  // eslint-disable-next-line no-control-regex
  const OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g
  // eslint-disable-next-line no-control-regex
  const CHARSET = /\x1b[()][AB012]/g
  // eslint-disable-next-line no-control-regex
  const MISC = /\x1b[>=<NOM78HDEFZ]/g
  return s.replace(CSI, '').replace(OSC, '').replace(CHARSET, '').replace(MISC, '')
}

/** Regex to detect localhost URLs in terminal output */
const LOCALHOST_RE = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)(?:\/[^\s'")>]*)?/g

/** Context keywords that indicate a frontend dev server */
const DEV_SERVER_RE =
  /\b(?:vite|hmr|hot\s*module|webpack|next(?:\.js)?|nuxt|svelte|angular|react|dev\s*server|compiled\s*(?:in|successfully)|ready\s*in|app\s*running|Local:|Network:)\b/i

/** Context keywords that indicate an API / backend server */
const API_SERVER_RE =
  /\b(?:api\s*(?:server|listening|started|running)|express|fastify|nestjs|flask|django|uvicorn|gunicorn|rails|sinatra|graphql|rest\s*api|backend\s*(?:server|listening|running|started))\b/i

/** Well-known frontend dev server ports — used to break ties between ambiguous URLs. */
const DEV_SERVER_PORTS = new Set([3000, 3001, 4200, 4321, 5173, 5174, 8000, 8080, 8888])

/** Extract port number from a URL string, defaults to 80. */
function extractPort(url: string): number {
  const match = url.match(/:(\d+)/)
  return match ? parseInt(match[1], 10) : 80
}

/** Collected URL entry for the detection window. */
interface CollectedUrl {
  url: string
  classification: 'dev' | 'api' | 'ambiguous'
  port: number
}

/**
 * Classify whether the terminal context around a URL indicates a dev server,
 * an API/backend server, or is ambiguous.
 */
function classifyServerUrl(context: string): 'dev' | 'api' | 'ambiguous' {
  const hasDev = DEV_SERVER_RE.test(context)
  const hasApi = API_SERVER_RE.test(context)
  if (hasDev) return 'dev'
  if (hasApi) return 'api'
  return 'ambiguous'
}

/**
 * Pick the best URL from a set of candidates collected during the detection window.
 *
 * Priority:
 * 1. Definite dev server (has dev keywords in context)
 * 2. Ambiguous URL on a well-known dev server port
 * 3. Ambiguous URL on any port
 * 4. null if everything is an API server
 */
function pickBestUrl(candidates: CollectedUrl[]): string | null {
  // 1. Prefer definite dev servers
  const devUrls = candidates.filter((c) => c.classification === 'dev')
  if (devUrls.length > 0) {
    // Among dev URLs, prefer well-known ports
    const onKnownPort = devUrls.find((c) => DEV_SERVER_PORTS.has(c.port))
    return (onKnownPort ?? devUrls[0]).url
  }

  // 2. Ambiguous URLs — prefer well-known dev server ports
  const ambiguous = candidates.filter((c) => c.classification === 'ambiguous')
  if (ambiguous.length > 0) {
    const onKnownPort = ambiguous.find((c) => DEV_SERVER_PORTS.has(c.port))
    return (onKnownPort ?? ambiguous[0]).url
  }

  // 3. All are API servers — don't open browser
  return null
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
  const onLocalhostDetectedRef = useRef(onLocalhostDetected)
  const localhostFiredRef = useRef(false)
  const seenUrlsRef = useRef<Set<string>>(new Set())
  const connectedRef = useRef(false)
  const [currentCwd, setCurrentCwd] = useState(cwd)
  const [gitBranch, setGitBranch] = useState<string | null>(null)
  const [aiProcessing, setAiProcessing] = useState(false)

  // Keep refs in sync
  pendingCommandRef.current = pendingCommand
  onCommandSentRef.current = onCommandSent
  onLocalhostDetectedRef.current = onLocalhostDetected

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

    // Guard against writes after disposal
    let disposed = false

    // NOTE: WebGL renderer intentionally disabled. On macOS P3 wide-gamut
    // displays, the WebGL canvas renders colors in a different color space than
    // CSS backgrounds, producing a visible vertical seam at the canvas edge.
    // The standard canvas 2D renderer shares CSS color space and has no seam.
    // Performance difference is negligible for terminal text rendering.

    // Route localhost URLs to the embedded browser pane, others to system browser
    const handleLinkClick = (url: string) => {
      if (/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)/i.test(url)) {
        window.dispatchEvent(new CustomEvent('browser:navigate', { detail: url }))
      } else {
        window.electronAPI.shell.openExternal(url)
      }
    }

    // Clickable links
    import('@xterm/addon-web-links')
      .then(({ WebLinksAddon }) => {
        if (disposed) return
        term.loadAddon(
          new WebLinksAddon(
            (_event, url) => {
              handleLinkClick(url)
            },
            {
              hover: (_event, text, location) => {
                void text
                void location
              },
            },
          ),
        )
      })
      .catch(() => {
        console.warn('WebLinksAddon import failed')
      })

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
              handleLinkClick(linkText)
            },
          })
        }
        callback(links.length > 0 ? links : undefined)
      },
    })

    // Let app-level shortcuts bubble to the global handler in App.tsx
    // instead of being consumed by xterm as terminal input.
    term.attachCustomKeyEventHandler((e) => {
      if (e.ctrlKey && e.key === 'Tab') return false
      if (e.metaKey && (e.key === '[' || e.key === ']')) return false
      if ((e.metaKey || e.ctrlKey) && ['p', 'n', 'b', 't', 'f'].includes(e.key)) return false
      return true
    })

    termRef.current = term
    fitRef.current = fitAddon

    // Queue live data until buffer replay finishes to avoid duplicates
    let replayDone = false
    const pendingData: string[] = []

    // Forward keystrokes to PTY
    const onDataDispose = term.onData((data) => {
      window.electronAPI.terminal.write({ terminalId, data })
    })

    // Reset localhost detection state for new terminal sessions
    localhostFiredRef.current = false
    seenUrlsRef.current.clear()

    // Buffer recent output for localhost detection across chunk boundaries
    let localhostBuffer = ''

    // Suppress localhost detection briefly after reconnecting to an existing PTY.
    // When switching back to a project whose dev server is still running, live
    // data arrives immediately after replay — without this grace period the
    // browser pane would auto-re-open on every project switch.
    let localhostSuppressedUntil = 0

    // Collection window: gather all detected URLs for 3 seconds before picking the best one.
    // If a definite dev server URL appears, fire immediately (no need to wait).
    const collectedUrls: CollectedUrl[] = []
    let collectionTimer: ReturnType<typeof setTimeout> | null = null
    const COLLECTION_WINDOW_MS = 3000

    /** Flush the collection window — pick the best URL and fire the callback. */
    function flushCollectionWindow() {
      collectionTimer = null
      if (localhostFiredRef.current || !onLocalhostDetectedRef.current) return
      if (collectedUrls.length === 0) return

      const best = pickBestUrl(collectedUrls)
      if (best) {
        localhostFiredRef.current = true
        onLocalhostDetectedRef.current(best)
      }
      // If best is null (all API), keep listening — a dev server might start later.
      // Clear collected so future URLs get a fresh window.
      collectedUrls.length = 0
    }

    // Receive PTY output — queue until replay finishes, then write live
    const removeDataListener = window.electronAPI.terminal.onData(terminalId, (data) => {
      if (disposed) return
      if (replayDone) {
        term.write(data)
        const newCwd = extractOsc7Cwd(data)
        if (newCwd) setCurrentCwd(newCwd)

        // Detect localhost URLs in terminal output.
        // Uses a collection window: gathers all URLs for 3 seconds, then picks
        // the best candidate. Definite dev server URLs fire immediately.
        if (
          !localhostFiredRef.current &&
          onLocalhostDetectedRef.current &&
          Date.now() > localhostSuppressedUntil
        ) {
          localhostBuffer += data
          if (localhostBuffer.length > 2048) {
            localhostBuffer = localhostBuffer.slice(-2048)
          }
          const clean = stripAnsi(localhostBuffer)
          LOCALHOST_RE.lastIndex = 0
          let match: RegExpExecArray | null
          while ((match = LOCALHOST_RE.exec(clean)) !== null) {
            const url = match[0].replace(/[.,;:]+$/, '')
            if (seenUrlsRef.current.has(url)) continue
            seenUrlsRef.current.add(url)

            // Check ~300 chars around the URL for classification hints
            const ctxStart = Math.max(0, match.index - 300)
            const ctxEnd = Math.min(clean.length, match.index + match[0].length + 300)
            const context = clean.slice(ctxStart, ctxEnd)

            const classification = classifyServerUrl(context)
            const port = extractPort(url)
            collectedUrls.push({ url, classification, port })

            // Definite dev server → fire immediately, no need to wait
            if (classification === 'dev') {
              if (collectionTimer) {
                clearTimeout(collectionTimer)
                collectionTimer = null
              }
              localhostFiredRef.current = true
              onLocalhostDetectedRef.current(url)
              break
            }

            // Ambiguous or API — start/reset collection window
            if (!collectionTimer) {
              collectionTimer = setTimeout(flushCollectionWindow, COLLECTION_WINDOW_MS)
            }
          }
        }
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
          .then(({ created }) => {
            if (disposed) return

            // Suppress ResizeObserver-triggered resizes briefly after PTY
            // creation/reconnection. The PTY was already created/resized with
            // the correct dimensions — sending another resize immediately
            // triggers SIGWINCH which causes the shell to reprint the prompt.
            suppressResizeUntil = Date.now() + 500

            // Deferred fit after the suppression window. If the container
            // resized during the 500ms window (e.g. layout settling), this
            // syncs xterm + PTY dimensions to prevent staircase rendering.
            setTimeout(() => {
              if (disposed) return
              fitAddon.fit()
              const { cols: c, rows: r } = term
              if (c >= 10 && r >= 2) {
                window.electronAPI.terminal.resize({ terminalId, cols: c, rows: r })
              }
            }, 550)

            if (created) {
              // Brand-new PTY — no buffer to replay. Flush any live data
              // that arrived during create() (e.g. the initial shell prompt).
              replayDone = true
              for (const chunk of pendingData) {
                term.write(chunk)
              }
              pendingData.length = 0
              return
            }

            // Existing PTY — fetch and replay scrollback for reconnection
            return window.electronAPI.terminal.getBuffer(terminalId)
          })
          .then((buffer) => {
            if (disposed || replayDone) return
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

            // Suppress localhost detection for 2 seconds after reconnection.
            // Live data from a still-running dev server would otherwise
            // re-trigger the browser pane every time the user switches back.
            localhostSuppressedUntil = Date.now() + 2000
          })
          .then(() => {
            if (disposed) return
            connectedRef.current = true
            // If a command was queued (e.g. from the play button), send it
            // after a brief delay so the shell prompt is ready.
            if (pendingCommandRef.current) {
              const cmd = pendingCommandRef.current
              // Show the AI overlay for cc commands, but not in the drawer
              // terminal — users want to watch the generation stream there.
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

    // Handle resize — debounce via rAF and guard against disposed state.
    // Enforce minimum 10 cols / 2 rows to prevent staircase rendering when
    // the container briefly collapses during layout transitions.
    // Suppress resizes briefly after PTY creation to avoid SIGWINCH echoing
    // the shell prompt a second time.
    //
    // Key insight: during CSS transitions (flex-basis, height), the container
    // size changes frame-by-frame. Fitting xterm mid-transition causes the
    // terminal text to fragment/staircase. We suppress fitting while any
    // ancestor is animating and do a single fit after the transition ends.
    let resizeRaf = 0
    let suppressResizeUntil = 0
    let transitionCount = 0

    // Detect when a CSS transition starts/ends on an ANCESTOR of this terminal.
    // Only suppress fitting when an ancestor's layout property is animating —
    // ignore transitions from unrelated elements (buttons, icons, etc.).
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
        // All ancestor transitions done — do a single authoritative fit
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
        // Skip fitting during ancestor CSS transitions — we'll fit once at transitionend
        if (transitionCount > 0) return
        // Skip fitting entirely during the post-creation suppression window.
        // Fitting without resizing the PTY creates a cols mismatch that
        // causes staircase rendering (each line offset further right).
        if (Date.now() < suppressResizeUntil) return
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
      connectedRef.current = false
      if (collectionTimer) clearTimeout(collectionTimer)
      onDataDispose.dispose()
      removeDataListener()
      cancelAnimationFrame(resizeRaf)
      resizeObserver.disconnect()
      document.removeEventListener('transitionstart', handleTransitionStart, true)
      document.removeEventListener('transitionend', handleTransitionEnd, true)
      document.removeEventListener('transitioncancel', handleTransitionEnd, true)
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [terminalId, projectId, cwd])

  // Handle late-arriving pendingCommand for an already-connected terminal.
  // The creation chain above handles commands present at mount time; this
  // effect catches commands that arrive *after* the PTY is ready (e.g. the
  // element picker sending a command to the already-open drawer terminal).
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

  // Listen for command completion to dismiss AI processing overlay
  useEffect(() => {
    if (!aiProcessing) return
    const removeListener = window.electronAPI.terminal.onCommandDone((event) => {
      if (event.terminalId === terminalId) {
        setAiProcessing(false)
      }
    })
    return removeListener
  }, [aiProcessing, terminalId])

  // Poll git branch — only when pane is active to avoid redundant subprocess calls.
  // Fetches immediately on activation or cwd change, then every 10s while active.
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
    const interval = setInterval(fetchBranch, 10_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [currentCwd, isActive])

  return (
    <div className={`terminal-pane${isActive ? ' terminal-pane--active' : ''}`} onClick={onFocus}>
      <div ref={containerRef} className="terminal-pane-xterm" onClick={handleXtermClick} />
      {aiProcessing && (
        <div className="terminal-ai-overlay">
          <div className="terminal-ai-overlay-content">
            <div className="terminal-ai-spinner">
              <span className="terminal-ai-dot" />
              <span className="terminal-ai-dot" />
              <span className="terminal-ai-dot" />
            </div>
            <span className="terminal-ai-label">Claude is working&hellip;</span>
          </div>
        </div>
      )}
      <PaneInputBar cwd={currentCwd} gitBranch={gitBranch} onSendCommand={handleSendCommand} />
    </div>
  )
}

export const TerminalPane = React.memo(TerminalPaneInner)
