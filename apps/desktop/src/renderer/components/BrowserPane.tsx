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
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
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
    addressBarValue,
    setAddressBarValue,
    pickerActive,
    canGoBack,
    setCanGoBack,
    canGoForward,
    setCanGoForward,
    loading,
    setLoading,
    loadError,
    setLoadError,
    navigateTo,
    handleAddressKeyDown,
    handleBack,
    handleForward,
    handleRefresh,
    togglePicker,
  } = useAddressBar({ startUrl, webviewRef, readyRef })

  useLocalhostProbe({
    initialUrl: startUrl,
    isLocalhost,
    webviewRef,
    readyRef,
    lastNavigatedRef,
    navigateTo,
    setAddressBarValue,
    setLoading,
    setLoadError,
  })

  useWebviewEvents({
    webviewRef,
    readyRef,
    lastNavigatedRef,
    setLoading,
    setLoadError,
    setAddressBarValue,
    setCanGoBack,
    setCanGoForward,
    onPickElement,
    onUrlChange,
  })

  return (
    <div className={`browser-pane${viewMode === 'pip' ? ' browser-pane--pip' : ''}`}>
      <div className={`browser-toolbar${viewMode === 'pip' ? ' browser-toolbar--pip' : ''}`}>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={handleBack}
          disabled={!canGoBack}
          title="Back"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={handleForward}
          disabled={!canGoForward}
          title="Forward"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3l5 5-5 5" />
          </svg>
        </button>
        <button type="button" className="browser-nav-btn" onClick={handleRefresh} title="Refresh">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13.5 8a5.5 5.5 0 11-1.4-3.7" />
            <path d="M13.5 3v4h-4" />
          </svg>
        </button>

        <input
          className="browser-address-bar"
          type="text"
          value={addressBarValue}
          onChange={(e) => setAddressBarValue(e.target.value)}
          onKeyDown={handleAddressKeyDown}
          spellCheck={false}
          autoComplete="off"
        />

        {loading && <span className="browser-loading-indicator" />}

        <button
          type="button"
          className={`browser-picker-btn${pickerActive ? ' browser-picker-btn--active' : ''}`}
          onClick={togglePicker}
          title={pickerActive ? 'Cancel picker' : 'Pick element'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3l4.5 10 1.8-4.2L13.5 7z" />
            <path d="M10 10l3.5 3.5" />
          </svg>
        </button>

        {onChangeViewMode && viewMode !== 'pip' && (
          <button
            type="button"
            className="browser-view-btn"
            onClick={() => onChangeViewMode('pip')}
            title="Mini window"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="1" width="14" height="10" rx="1.5" />
              <rect x="8" y="6" width="6" height="4" rx="1" fill="currentColor" />
            </svg>
          </button>
        )}

        {onChangeViewMode && viewMode === 'fullscreen' ? (
          <button
            type="button"
            className="browser-view-btn"
            onClick={() => onChangeViewMode('split')}
            title="Exit fullscreen"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2v4H2M10 14v-4h4M14 2l-4 4M2 14l4-4" />
            </svg>
          </button>
        ) : onChangeViewMode && viewMode !== 'pip' ? (
          <button
            type="button"
            className="browser-view-btn"
            onClick={() => onChangeViewMode('fullscreen')}
            title="Fullscreen"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 6V2h4M14 10v4h-4M14 2l-5 5M2 14l5-5" />
            </svg>
          </button>
        ) : null}

        {onChangeViewMode && viewMode === 'pip' && (
          <button
            type="button"
            className="browser-view-btn"
            onClick={() => onChangeViewMode('split')}
            title="Expand"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 6V2h4M14 10v4h-4M14 2l-5 5M2 14l5-5" />
            </svg>
          </button>
        )}
      </div>

      <div ref={webviewContainerRef} className="browser-webview-container">
        {loadError && (
          <div className="browser-load-error">
            <div className="browser-load-error-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="8" r="7" />
                <path d="M8 5v3M8 10.5v.5" />
              </svg>
            </div>
            <p className="browser-load-error-msg">{loadError}</p>
            <p className="browser-load-error-hint">
              Start the dev server in the terminal, then press refresh.
            </p>
            <button type="button" className="browser-load-error-retry" onClick={handleRefresh}>
              Retry
            </button>
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
