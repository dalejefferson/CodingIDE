import { useState, useCallback, useRef, useEffect } from 'react'
import type { BrowserViewMode } from '@shared/types'
import { triggerResize } from '../utils/triggerResize'
import { emit, on } from '../utils/eventBus'

/** Extract the port number from a localhost URL, or null if not a localhost URL */
function extractLocalhostPort(url: string | undefined): number | null {
  if (!url) return null
  const match = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

interface UseBrowserPaneOptions {
  project: { id: string; name: string; browserUrl?: string | null; browserViewMode?: BrowserViewMode | null }
  isVisible: boolean
  getPortOwner?: (port: number) => string | null
  registerPort?: (projectId: string, port: number) => void
  unregisterPort?: (projectId: string, port: number) => void
}

export function useBrowserPane({
  project,
  isVisible,
  getPortOwner,
  registerPort,
  unregisterPort,
}: UseBrowserPaneOptions) {
  const [viewMode, setViewMode] = useState<BrowserViewMode>(() => {
    const persisted = project.browserViewMode
    if (!persisted || persisted === 'closed') return 'closed'
    if (!project.browserUrl) return 'closed'
    return persisted
  })
  const [browserUrl, setBrowserUrl] = useState<string | undefined>(project.browserUrl ?? undefined)
  const [splitRatio, setSplitRatio] = useState(0.35)
  const [isDragging, setIsDragging] = useState(false)
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null)
  const [pipSize, setPipSize] = useState<{ w: number; h: number }>({ w: 400, h: 300 })
  const panelsRef = useRef<HTMLDivElement>(null)
  const previousModeRef = useRef<BrowserViewMode>('split')

  const browserVisible = viewMode !== 'closed'
  const showSplitBrowser = viewMode === 'split' || viewMode === 'focused'

  const [browserEverOpened, setBrowserEverOpened] = useState(browserVisible)
  useEffect(() => {
    if (browserVisible && !browserEverOpened) setBrowserEverOpened(true)
  }, [browserVisible, browserEverOpened])

  // Track which port this project is using and register/deregister on change.
  // Dual registry: renderer-side (fast UI checks) + main-process (OS-level truth).
  const lastPortRef = useRef<number | null>(extractLocalhostPort(browserUrl))
  useEffect(() => {
    const newPort = extractLocalhostPort(browserUrl)
    const oldPort = lastPortRef.current

    if (oldPort !== newPort) {
      if (oldPort !== null) {
        unregisterPort?.(project.id, oldPort)
        window.electronAPI.ports.unregister({ projectId: project.id, port: oldPort }).catch(() => {})
      }
      if (newPort !== null) {
        registerPort?.(project.id, newPort)
        window.electronAPI.ports.register({ projectId: project.id, port: newPort }).catch(() => {})
      }
      lastPortRef.current = newPort
    }

    return () => {
      // Cleanup on unmount
      const port = lastPortRef.current
      if (port !== null) {
        unregisterPort?.(project.id, port)
        window.electronAPI.ports.unregister({ projectId: project.id, port }).catch(() => {})
      }
    }
  }, [browserUrl, project.id, registerPort, unregisterPort])

  // Persist browser URL to disk when it changes (debounced to avoid write spam)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      window.electronAPI.browser
        .setProjectBrowser({
          id: project.id,
          browserUrl: browserUrl ?? null,
          browserViewMode: viewMode,
        })
        .catch(() => {})
    }, 500)
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    }
  }, [browserUrl, viewMode, project.id])

  const handleBrowserUrlChange = useCallback((url: string) => {
    setBrowserUrl(url)
  }, [])

  const handleLocalhostDetected = useCallback(
    (url: string) => {
      const port = extractLocalhostPort(url)

      // Step 1: Check renderer-side registry for conflicts (fast, synchronous)
      if (port !== null && getPortOwner) {
        const owner = getPortOwner(port)
        if (owner !== null && owner !== project.id) {
          emit('app:show-toast', {
            kind: 'warning',
            projectId: project.id,
            projectName: project.name,
            message: `Port ${port} is already in use by another project`,
          })
          return
        }
      }

      // Step 2: Register in both renderer-side and main-process registries
      if (port !== null) {
        registerPort?.(project.id, port)
        window.electronAPI.ports.register({ projectId: project.id, port }).catch(() => {})
      }

      // Step 3: Open browser pane
      setBrowserUrl(url)
      setViewMode('focused')
      emit('sidebar:collapse')
    },
    [getPortOwner, registerPort, project.id, project.name],
  )

  const handleChangeViewMode = useCallback((mode: BrowserViewMode) => {
    setViewMode((prev) => {
      if (mode !== 'closed') {
        previousModeRef.current = prev === 'closed' ? 'split' : prev
      }
      return mode
    })
  }, [])

  const toggleBrowser = useCallback(() => {
    setViewMode((prev) => {
      if (prev === 'closed') {
        emit('sidebar:collapse')
        return 'split'
      }
      return 'closed'
    })
  }, [])

  // Only listen for browser events when this workspace is visible.
  useEffect(() => {
    if (!isVisible) return
    return on('browser:set-view-mode', (mode) => {
      setViewMode((prev) => {
        if (mode === 'focused' && prev === 'focused') return 'split'
        previousModeRef.current = prev === 'closed' ? 'split' : prev
        return mode
      })
    })
  }, [isVisible])

  // Navigate the embedded browser when a localhost link is clicked in the terminal
  useEffect(() => {
    if (!isVisible) return
    console.log('[useBrowserPane] registering browser:navigate listener')
    return on('browser:navigate', (url) => {
      console.log('[useBrowserPane] browser:navigate received:', url)
      setBrowserUrl(url)
      setViewMode((prev) => {
        if (prev === 'closed') {
          emit('sidebar:collapse')
          return 'split'
        }
        return prev
      })
    })
  }, [isVisible])

  // Fire resize after view mode transitions settle.
  // CSS transition on .workspace-terminal/.workspace-browser is 200ms,
  // so fire well after it completes to ensure xterm fits to final dimensions.
  useEffect(() => {
    if (viewMode === 'split' || viewMode === 'closed') {
      triggerResize(350)
    }
  }, [viewMode])

  useEffect(() => {
    if (viewMode === 'pip') {
      setPipPos({ x: window.innerWidth - pipSize.w - 16, y: window.innerHeight - pipSize.h - 16 })
    }
  }, [viewMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fire resize when becoming visible so terminals + browser recalculate dimensions.
  useEffect(() => {
    if (isVisible) {
      triggerResize()
    }
  }, [isVisible])

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const parent = panelsRef.current
    if (!parent) return
    setIsDragging(true)
    document.body.classList.add('is-resizing-h')
    const parentRect = parent.getBoundingClientRect()
    let rafId = 0
    const onMouseMove = (ev: MouseEvent) => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const ratio = (ev.clientX - parentRect.left) / parentRect.width
        setSplitRatio(Math.max(0.05, Math.min(0.95, ratio)))
      })
    }
    const onMouseUp = () => {
      cancelAnimationFrame(rafId)
      setIsDragging(false)
      document.body.classList.remove('is-resizing-h')
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  // Use individual flex properties instead of the `flex` shorthand
  const terminalStyle =
    viewMode === 'split'
      ? { flexGrow: 0, flexShrink: 0, flexBasis: `${splitRatio * 100}%` }
      : viewMode === 'focused'
        ? { flexGrow: 0, flexShrink: 0, flexBasis: '28px', overflow: 'hidden' as const }
        : {}

  return {
    viewMode,
    setViewMode,
    browserUrl,
    setBrowserUrl,
    splitRatio,
    isDragging,
    pipPos,
    setPipPos,
    pipSize,
    setPipSize,
    panelsRef,
    previousModeRef,
    browserVisible,
    showSplitBrowser,
    browserEverOpened,
    handleBrowserUrlChange,
    handleLocalhostDetected,
    handleChangeViewMode,
    toggleBrowser,
    handleDividerMouseDown,
    terminalStyle,
  }
}
