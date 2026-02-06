/**
 * BrowserPane — embedded browser panel with element picker mode.
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

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { buildCssSelector, trimInnerText, formatPickerPayload } from '@shared/elementPicker'
import type { ElementPickerPayload, BrowserViewMode } from '@shared/types'
import '../styles/BrowserPane.css'

interface BrowserPaneProps {
  initialUrl?: string
  projectId?: string
  onPickElement: (formatted: string) => void
  onUrlChange?: (url: string) => void
  viewMode?: BrowserViewMode
  onChangeViewMode?: (mode: BrowserViewMode) => void
}

/** Prefix used to identify picker messages in console output */
const PICKER_MSG_PREFIX = '__ELEMENT_PICKER__:'

/** Attributes worth surfacing in the picker payload */
const INTERESTING_ATTRS = ['href', 'src', 'type', 'role', 'aria-label', 'data-testid', 'name']

/**
 * Content script injected into the webview when picker mode is active.
 * Highlights elements on hover and console.logs payload on click.
 */
const PICKER_SCRIPT = `
(function() {
  if (window.__elementPickerActive) return;
  window.__elementPickerActive = true;

  const overlay = document.createElement('div');
  overlay.id = '__picker-overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #4f8cff;background:rgba(79,140,255,0.12);transition:all 0.08s ease;display:none;';
  document.body.appendChild(overlay);

  function updateOverlay(el) {
    if (!el) { overlay.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = r.top + 'px';
    overlay.style.left = r.left + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
  }

  function onMouseMove(e) {
    updateOverlay(e.target);
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;

    const INTERESTING = ${JSON.stringify(INTERESTING_ATTRS)};
    const attrs = {};
    for (const name of INTERESTING) {
      if (el.hasAttribute && el.hasAttribute(name)) attrs[name] = el.getAttribute(name);
    }

    const payload = {
      tag: el.tagName ? el.tagName.toLowerCase() : 'unknown',
      id: el.id || null,
      classes: el.classList ? Array.from(el.classList) : [],
      innerText: (el.innerText || '').slice(0, 500),
      attributes: attrs,
    };

    console.log('${PICKER_MSG_PREFIX}' + JSON.stringify(payload));
  }

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);

  window.__elementPickerCleanup = function() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    window.__elementPickerActive = false;
    delete window.__elementPickerCleanup;
  };
})();
`

const PICKER_CLEANUP_SCRIPT = `
  if (window.__elementPickerCleanup) window.__elementPickerCleanup();
`

const DEFAULT_URL = 'https://www.google.com'

/** Regex matching localhost/127.0.0.1/0.0.0.0 URLs */
const LOCALHOST_URL_RE = /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)/i

/** Quick reachability check — resolves true if the URL responds, false on error. */
async function isReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal })
    clearTimeout(timer)
    return true
  } catch {
    return false
  }
}

/** Retry delays (ms) for localhost probe — progressively longer waits. */
const PROBE_DELAYS = [0, 1000, 2000, 3000, 5000]

/** Virtual viewport width used to render pages at desktop layout */
const VIRTUAL_WIDTH = 1280

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
  // For localhost URLs, start with about:blank and probe first to avoid
  // Electron's ERR_CONNECTION_REFUSED stderr noise when the server is down.
  const isLocalhost = LOCALHOST_URL_RE.test(startUrl)
  const webviewSrc = isLocalhost ? 'about:blank' : startUrl
  const [addressBarValue, setAddressBarValue] = useState(startUrl)
  const [pickerActive, setPickerActive] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const readyRef = useRef(false)
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

  const navigateTo = useCallback((targetUrl: string) => {
    const wv = webviewRef.current
    if (!wv || !readyRef.current) return
    let normalized = targetUrl.trim()
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized
    }
    setAddressBarValue(normalized)
    setLoadError(null)
    wv.loadURL(normalized)
  }, [])

  const handleAddressKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        e.preventDefault()
        navigateTo(addressBarValue)
      }
    },
    [addressBarValue, navigateTo],
  )

  const handleBack = useCallback(() => {
    webviewRef.current?.goBack()
  }, [])

  const handleForward = useCallback(() => {
    webviewRef.current?.goForward()
  }, [])

  const handleRefresh = useCallback(() => {
    const wv = webviewRef.current
    if (!wv) return
    let url = addressBarValue.trim()
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url
    }
    setLoadError(null)
    wv.loadURL(url)
  }, [addressBarValue])

  const togglePicker = useCallback(() => {
    const wv = webviewRef.current
    if (!wv || !readyRef.current) return

    if (pickerActive) {
      wv.executeJavaScript(PICKER_CLEANUP_SCRIPT).catch(() => {})
      setPickerActive(false)
    } else {
      wv.executeJavaScript(PICKER_SCRIPT).catch(() => {})
      setPickerActive(true)
    }
  }, [pickerActive])

  // For localhost URLs, probe the port with retries before navigating to avoid
  // Electron ERR_CONNECTION_REFUSED errors.  Non-localhost URLs load normally
  // via the webview `src` attribute.
  const lastNavigatedRef = useRef(isLocalhost ? '' : startUrl)
  const probeUrlRef = useRef(startUrl)
  probeUrlRef.current = startUrl

  useEffect(() => {
    if (!isLocalhost) return
    let cancelled = false

    const probeWithRetries = async () => {
      const wv = webviewRef.current
      if (!wv) return

      for (let i = 0; i < PROBE_DELAYS.length; i++) {
        if (cancelled) return
        if (i > 0) {
          await new Promise((r) => setTimeout(r, PROBE_DELAYS[i]))
          if (cancelled) return
        }

        const url = probeUrlRef.current
        const reachable = await isReachable(url)
        if (cancelled) return

        if (reachable) {
          readyRef.current = true
          lastNavigatedRef.current = url
          setLoadError(null)
          setAddressBarValue(url)
          wv.loadURL(url)
          return
        }
      }

      // All retries exhausted
      if (!cancelled) {
        setLoading(false)
        readyRef.current = true
        setLoadError(`Unable to connect to ${probeUrlRef.current}`)
      }
    }

    // Wait for the webview dom-ready on about:blank before probing
    const wv = webviewRef.current
    if (wv) {
      const onReady = () => {
        wv.removeEventListener('dom-ready', onReady)
        probeWithRetries()
      }
      wv.addEventListener('dom-ready', onReady)
    }

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Navigate to new URL when initialUrl changes after mount, but skip if the
  // webview is already showing this URL (avoids reloading on project switch).
  // For localhost URLs, probe with retries since the server may still be starting.
  useEffect(() => {
    if (!initialUrl || initialUrl === lastNavigatedRef.current) return
    const isLocal = LOCALHOST_URL_RE.test(initialUrl)
    if (!isLocal) {
      lastNavigatedRef.current = initialUrl
      navigateTo(initialUrl)
      return
    }

    let cancelled = false
    const probeAndNavigate = async () => {
      const wv = webviewRef.current
      if (!wv) return

      for (let i = 0; i < PROBE_DELAYS.length; i++) {
        if (cancelled) return
        if (i > 0) {
          await new Promise((r) => setTimeout(r, PROBE_DELAYS[i]))
          if (cancelled) return
        }

        const reachable = await isReachable(initialUrl)
        if (cancelled) return

        if (reachable) {
          readyRef.current = true
          lastNavigatedRef.current = initialUrl
          setLoadError(null)
          setAddressBarValue(initialUrl)
          wv.loadURL(initialUrl)
          return
        }
      }

      if (!cancelled) {
        setLoading(false)
        setLoadError(`Unable to connect to ${initialUrl}`)
      }
    }

    probeAndNavigate()
    return () => {
      cancelled = true
    }
  }, [initialUrl, navigateTo])

  // Attach webview event listeners once the element mounts
  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return

    const onDomReady = () => {
      readyRef.current = true
      setLoading(false)
    }

    const onDidStartLoading = () => {
      setLoading(true)
    }

    const onDidStopLoading = () => {
      readyRef.current = true
      setLoading(false)
    }

    const onDidFailLoad = (e: Electron.DidFailLoadEvent) => {
      // Ignore aborted loads (e.g. navigation interrupted by another load)
      if (e.errorCode === -3) return

      const failedUrl = e.validatedURL || wv.getURL()

      // Ignore about:blank errors — this is the placeholder page used while
      // probing localhost URLs before the dev server is ready.
      if (failedUrl === 'about:blank' || failedUrl === 'about:blank/') return

      setLoading(false)
      readyRef.current = true

      // Connection refused / host unreachable on localhost — the dev server
      // isn't running.  Show an inline error instead of a blank white page.
      if (e.errorCode === -102 || e.errorCode === -105 || e.errorCode === -106) {
        setLoadError(`Unable to connect to ${failedUrl}`)
      } else {
        setLoadError(`Failed to load ${failedUrl} (${e.errorDescription})`)
      }
    }

    const onDidNavigate = () => {
      // Clear any previous load error on successful navigation
      setLoadError(null)
    }

    const handleNavUpdate = () => {
      const currentUrl = wv.getURL()
      // Don't track about:blank — it's a transient placeholder for localhost probing
      if (currentUrl === 'about:blank' || currentUrl === 'about:blank/') return
      setAddressBarValue(currentUrl)
      setCanGoBack(wv.canGoBack())
      setCanGoForward(wv.canGoForward())
      lastNavigatedRef.current = currentUrl
      onUrlChange?.(currentUrl)
    }

    const handleConsoleMessage = (e: Electron.ConsoleMessageEvent) => {
      if (!e.message.startsWith(PICKER_MSG_PREFIX)) return
      try {
        const json = e.message.slice(PICKER_MSG_PREFIX.length)
        const raw = JSON.parse(json)
        const tag = typeof raw.tag === 'string' ? raw.tag : 'unknown'
        const id = typeof raw.id === 'string' ? raw.id : null
        const classes = Array.isArray(raw.classes)
          ? raw.classes.filter((c: unknown) => typeof c === 'string')
          : []
        const innerText = typeof raw.innerText === 'string' ? trimInnerText(raw.innerText) : ''
        const selector = buildCssSelector(tag, id, classes)

        const attrs: Record<string, string> = {}
        if (typeof raw.attributes === 'object' && raw.attributes !== null) {
          for (const [k, v] of Object.entries(raw.attributes)) {
            if (typeof v === 'string') attrs[k] = v
          }
        }

        const payload: ElementPickerPayload = {
          selector,
          innerText,
          tag,
          id,
          classes,
          attributes: attrs,
        }

        onPickElement(formatPickerPayload(payload))

        // Keep picker active for chaining multiple selections.
        // User can manually toggle it off via the picker button.
      } catch {
        // Ignore malformed messages
      }
    }

    wv.addEventListener('dom-ready', onDomReady)
    wv.addEventListener('did-start-loading', onDidStartLoading)
    wv.addEventListener('did-stop-loading', onDidStopLoading)
    wv.addEventListener('did-fail-load', onDidFailLoad)
    wv.addEventListener('did-navigate', onDidNavigate)
    wv.addEventListener('did-navigate', handleNavUpdate)
    wv.addEventListener('did-navigate-in-page', handleNavUpdate)
    wv.addEventListener('console-message', handleConsoleMessage)

    return () => {
      wv.removeEventListener('dom-ready', onDomReady)
      wv.removeEventListener('did-start-loading', onDidStartLoading)
      wv.removeEventListener('did-stop-loading', onDidStopLoading)
      wv.removeEventListener('did-fail-load', onDidFailLoad)
      wv.removeEventListener('did-navigate', onDidNavigate)
      wv.removeEventListener('did-navigate', handleNavUpdate)
      wv.removeEventListener('did-navigate-in-page', handleNavUpdate)
      wv.removeEventListener('console-message', handleConsoleMessage)
    }
  }, [onPickElement, onUrlChange])

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
