import { useEffect, useRef } from 'react'

/** Regex matching localhost/127.0.0.1/0.0.0.0 URLs */
export const LOCALHOST_URL_RE = /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)/i

/** Default URL when none specified */
export const DEFAULT_URL = 'https://www.google.com'

/** Retry delays (ms) for localhost probe -- progressively longer waits. */
export const PROBE_DELAYS = [0, 1000, 2000, 3000, 5000]

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

  // Navigate to new URL when initialUrl changes after mount
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
  }, [initialUrl, navigateTo, lastNavigatedRef, webviewRef, readyRef, setLoadError, setAddressBarValue, setLoading])
}
