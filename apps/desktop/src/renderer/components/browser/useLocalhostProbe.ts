import { useEffect, useRef } from 'react'

/** Regex matching localhost/127.0.0.1/0.0.0.0 URLs */
export const LOCALHOST_URL_RE = /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)/i

/** Extract the port number from a localhost URL, or null */
function extractPort(url: string): number | null {
  const m = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/i)
  return m?.[1] ? parseInt(m[1], 10) : null
}

/**
 * OS-level port check via the main process.
 * Returns true if the port is bound (i.e. something is listening), false otherwise.
 * Swallows IPC errors and returns true (assume bound) to avoid false negatives.
 */
async function isPortBoundAtOS(port: number): Promise<boolean> {
  try {
    const result = await window.electronAPI.ports.check({ port })
    return result.inUse
  } catch {
    // IPC failure — be optimistic, fall through to normal probing
    return true
  }
}

/** Default URL when none specified */
export const DEFAULT_URL = 'https://www.google.com'

/**
 * Retry delays (ms) for localhost probe -- progressively longer waits.
 * Dev servers (Vite, webpack, Expo) can take 15-30s on cold start,
 * so we cover ~30s total: 0+0.5+1+1.5+2+3+4+5+6+8 = ~31s.
 */
export const PROBE_DELAYS = [0, 500, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000]

/** Interval (ms) for background polling after initial retries exhaust. */
const BACKGROUND_POLL_INTERVAL = 5000

/** Virtual viewport width used to render pages at desktop layout */
export const VIRTUAL_WIDTH = 1280

/** Quick reachability check -- resolves true if the URL responds, false on error. */
export async function isReachable(url: string): Promise<boolean> {
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

interface UseLocalhostProbeOpts {
  initialUrl: string
  isLocalhost: boolean
  webviewRef: React.MutableRefObject<Electron.WebviewTag | null>
  readyRef: React.MutableRefObject<boolean>
  lastNavigatedRef: React.MutableRefObject<string>
  navigateTo: (url: string) => void
  setAddressBarValue: (val: string) => void
  setLoading: (val: boolean) => void
  setLoadError: (val: string | null) => void
}

/**
 * Run the probe schedule, then fall back to background polling.
 * Before starting HTTP retries, does a quick OS-level port check.
 * If the port is not bound at all, reports the error immediately
 * rather than wasting ~30s on futile HTTP HEAD requests.
 *
 * Returns a cleanup function that cancels all pending work.
 */
function startProbe(
  getUrl: () => string,
  getWebview: () => Electron.WebviewTag | null,
  onSuccess: (url: string, wv: Electron.WebviewTag) => void,
  onExhausted: (url: string) => void,
): () => void {
  let cancelled = false
  let bgTimer: ReturnType<typeof setTimeout> | null = null

  const run = async () => {
    const wv = getWebview()
    if (!wv) return

    // Phase 0: OS-level port check — if nothing is listening, fail fast
    const url0 = getUrl()
    const port = extractPort(url0)
    if (port !== null) {
      const bound = await isPortBoundAtOS(port)
      if (cancelled) return
      if (!bound) {
        onExhausted(url0)
        // Still start background polling — the server may come up later
        startBackgroundPoll()
        return
      }
    }

    // Phase 1: scheduled HTTP retries
    for (let i = 0; i < PROBE_DELAYS.length; i++) {
      if (cancelled) return
      if (i > 0) {
        await new Promise((r) => setTimeout(r, PROBE_DELAYS[i]))
        if (cancelled) return
      }

      const url = getUrl()
      const reachable = await isReachable(url)
      if (cancelled) return

      if (reachable) {
        onSuccess(url, wv)
        return
      }
    }

    // Phase 2: show error but keep polling in the background
    if (!cancelled) {
      onExhausted(getUrl())
      startBackgroundPoll()
    }
  }

  const startBackgroundPoll = () => {
    if (cancelled) return
    bgTimer = setTimeout(async () => {
      bgTimer = null
      if (cancelled) return
      const wv = getWebview()
      if (!wv) return

      const url = getUrl()
      const reachable = await isReachable(url)
      if (cancelled) return

      if (reachable) {
        onSuccess(url, wv)
      } else {
        startBackgroundPoll()
      }
    }, BACKGROUND_POLL_INTERVAL)
  }

  run()

  return () => {
    cancelled = true
    if (bgTimer) clearTimeout(bgTimer)
  }
}

/**
 * For localhost URLs, probe the port with retries before navigating.
 * Also handles subsequent initialUrl changes.
 */
export function useLocalhostProbe({
  initialUrl,
  isLocalhost,
  webviewRef,
  readyRef,
  lastNavigatedRef,
  navigateTo,
  setAddressBarValue,
  setLoading,
  setLoadError,
}: UseLocalhostProbeOpts) {
  const probeUrlRef = useRef(initialUrl)
  probeUrlRef.current = initialUrl

  // Initial probe for localhost URLs on mount
  useEffect(() => {
    if (!isLocalhost) return
    let cleanup: (() => void) | null = null

    const onSuccess = (url: string, wv: Electron.WebviewTag) => {
      readyRef.current = true
      lastNavigatedRef.current = url
      setLoadError(null)
      setAddressBarValue(url)
      wv.loadURL(url)
    }

    const onExhausted = (url: string) => {
      setLoading(false)
      readyRef.current = true
      setLoadError(`Unable to connect to ${url}`)
    }

    // Wait for the webview dom-ready on about:blank before probing
    const wv = webviewRef.current
    if (wv) {
      const onReady = () => {
        wv.removeEventListener('dom-ready', onReady)
        cleanup = startProbe(
          () => probeUrlRef.current,
          () => webviewRef.current,
          onSuccess,
          onExhausted,
        )
      }
      wv.addEventListener('dom-ready', onReady)
    }

    return () => {
      cleanup?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Navigate to new URL when initialUrl changes after mount
  useEffect(() => {
    if (!initialUrl || initialUrl === lastNavigatedRef.current) return
    const isLocal = LOCALHOST_URL_RE.test(initialUrl)
    if (!isLocal) {
      lastNavigatedRef.current = initialUrl
      navigateTo(initialUrl)
      return
    }

    const onSuccess = (url: string, wv: Electron.WebviewTag) => {
      readyRef.current = true
      lastNavigatedRef.current = url
      setLoadError(null)
      setAddressBarValue(url)
      wv.loadURL(url)
    }

    const onExhausted = (url: string) => {
      setLoading(false)
      setLoadError(`Unable to connect to ${url}`)
    }

    const cancel = startProbe(
      () => initialUrl,
      () => webviewRef.current,
      onSuccess,
      onExhausted,
    )

    return cancel
  }, [initialUrl, navigateTo, lastNavigatedRef, webviewRef, readyRef, setLoadError, setAddressBarValue, setLoading])
}
