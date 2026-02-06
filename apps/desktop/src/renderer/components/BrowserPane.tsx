/**
 * BrowserPane -- embedded browser panel with element picker mode.
 *
 * Uses Electron's <webview> tag with a separate partition for isolation.
 * The element picker injects a content script that highlights hovered
 * elements and sends picked-element data back via console.log with a
 * known prefix (since the webview guest has no nodeIntegration).
 *
 * Security:
 *   - webview uses `partition="persist:browser"` (isolated storage)
 *   - No `nodeintegration` or `nodeintegrationinsubframes`
 *   - Content script injected via `executeJavaScript` (no preload file)
 *   - Received messages validated before use
 */

import React, { useRef, useEffect, useMemo, useState } from 'react'
import type { BrowserViewMode } from '@shared/types'
import { LOCALHOST_URL_RE, DEFAULT_URL, VIRTUAL_WIDTH } from './browser/useLocalhostProbe'
import { useLocalhostProbe } from './browser/useLocalhostProbe'
import { useAddressBar } from './browser/useAddressBar'
import { useWebviewEvents } from './browser/useWebviewEvents'
import { BrowserNavBar } from './browser/BrowserNavBar'
import '../styles/BrowserPane.css'

interface BrowserPaneProps {
  initialUrl?: string
  projectId?: string
  onPickElement: (formatted: string) => void
  onUrlChange?: (url: string) => void
  viewMode?: BrowserViewMode
  onChangeViewMode?: (mode: BrowserViewMode) => void
}

function BrowserPaneInner({
  initialUrl,
  projectId,
  onPickElement,
  onUrlChange,
  viewMode = 'split',
  onChangeViewMode,
}: BrowserPaneProps) {
  const partition = projectId ? `persist:browser-${projectId}` : 'persist:browser'
  const startUrl = initialUrl || DEFAULT_URL
  const isLocalhost = LOCALHOST_URL_RE.test(startUrl)
  const webviewSrc = isLocalhost ? 'about:blank' : startUrl

  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const readyRef = useRef(false)
  const lastNavigatedRef = useRef(isLocalhost ? '' : startUrl)
  const webviewContainerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null)

  // Track the webview container dimensions for desktop-viewport scaling
  useEffect(() => {
    const el = webviewContainerRef.current
    if (!el) return
    let rafId = 0
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const entry = entries[0]
        if (!entry) return
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setContainerSize({ w: Math.round(width), h: Math.round(height) })
        }
      })
    })
    observer.observe(el)
    return () => { cancelAnimationFrame(rafId); observer.disconnect() }
  }, [])

  // Compute scale and virtual height so the webview always renders at desktop width
  const viewportStyle = useMemo(() => {
    if (!containerSize || containerSize.w >= VIRTUAL_WIDTH) return undefined
    const scale = containerSize.w / VIRTUAL_WIDTH
    const virtualHeight = Math.round(containerSize.h / scale)
    return {
      width: `${VIRTUAL_WIDTH}px`,
      height: `${virtualHeight}px`,
      transform: `scale(${scale})`,
      transformOrigin: 'top left' as const,
    }
  }, [containerSize])

  const {
    addressBarValue, setAddressBarValue, pickerActive, canGoBack, setCanGoBack,
    canGoForward, setCanGoForward, loading, setLoading, loadError, setLoadError,
    navigateTo, handleAddressKeyDown, handleBack, handleForward, handleRefresh, togglePicker,
  } = useAddressBar({ startUrl, webviewRef, readyRef })

  useLocalhostProbe({
    initialUrl: startUrl, isLocalhost, webviewRef, readyRef, lastNavigatedRef,
    navigateTo, setAddressBarValue, setLoading, setLoadError,
  })

  useWebviewEvents({
    webviewRef, readyRef, lastNavigatedRef, setLoading, setLoadError,
    setAddressBarValue, setCanGoBack, setCanGoForward, onPickElement, onUrlChange,
  })

  return (
    <div className={`browser-pane${viewMode === 'pip' ? ' browser-pane--pip' : ''}`}>
      <BrowserNavBar
        viewMode={viewMode}
        addressBarValue={addressBarValue}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        loading={loading}
        pickerActive={pickerActive}
        onAddressBarChange={setAddressBarValue}
        onAddressKeyDown={handleAddressKeyDown}
        onBack={handleBack}
        onForward={handleForward}
        onRefresh={handleRefresh}
        onTogglePicker={togglePicker}
        onChangeViewMode={onChangeViewMode}
      />

      <div ref={webviewContainerRef} className="browser-webview-container">
        {loadError && (
          <div className="browser-load-error">
            <div className="browser-load-error-icon">
              <svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="7" />
                <path d="M8 5v3M8 10.5v.5" />
              </svg>
            </div>
            <p className="browser-load-error-msg">{loadError}</p>
            <p className="browser-load-error-hint">Start the dev server in the terminal, then press refresh.</p>
            <button type="button" className="browser-load-error-retry" onClick={handleRefresh}>Retry</button>
          </div>
        )}
        <webview
          ref={webviewRef as React.LegacyRef<Electron.WebviewTag>}
          className="browser-webview"
          src={webviewSrc}
          partition={partition}
          style={viewportStyle}
        />
      </div>
    </div>
  )
}

export const BrowserPane = React.memo(BrowserPaneInner)
