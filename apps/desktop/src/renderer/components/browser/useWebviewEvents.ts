import { useEffect } from 'react'
import { buildCssSelector, trimInnerText, formatPickerPayload } from '@shared/elementPicker'
import type { ElementPickerPayload } from '@shared/types'
import { PICKER_MSG_PREFIX } from './pickerScript'

interface UseWebviewEventsOpts {
  webviewRef: React.MutableRefObject<Electron.WebviewTag | null>
  readyRef: React.MutableRefObject<boolean>
  lastNavigatedRef: React.MutableRefObject<string>
  setLoading: (val: boolean) => void
  setLoadError: (val: string | null) => void
  setAddressBarValue: (val: string) => void
  setCanGoBack: (val: boolean) => void
  setCanGoForward: (val: boolean) => void
  onPickElement: (formatted: string) => void
  onUrlChange?: (url: string) => void
}

/** Attach webview event listeners once the element mounts */
export function useWebviewEvents({
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
}: UseWebviewEventsOpts) {
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

      // Ignore about:blank errors -- placeholder page for localhost probing
      if (failedUrl === 'about:blank' || failedUrl === 'about:blank/') return

      setLoading(false)
      readyRef.current = true

      // Connection refused / host unreachable on localhost
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

    // ---- Crash & unresponsive recovery ----

    let unresponsiveTimer: ReturnType<typeof setTimeout> | null = null
    let unresponsiveErrorShown = false

    const onRenderProcessGone = (e: Event) => {
      // The webview's renderer process crashed, was killed, or ran out of memory.
      // Surface the reason through the existing error UI so the user can retry.
      const detail = (e as CustomEvent).detail as { reason?: string } | undefined
      const reason = detail?.reason ?? 'unknown'

      // 'clean-exit' is a normal shutdown (e.g. navigated away), not an error
      if (reason === 'clean-exit') return

      console.error(`[BrowserPane] render process gone: ${reason}`)
      setLoading(false)
      readyRef.current = false

      const label: Record<string, string> = {
        crashed: 'The page crashed unexpectedly',
        killed: 'The page process was terminated',
        oom: 'The page ran out of memory',
        'abnormal-exit': 'The page exited unexpectedly',
        'launch-failed': 'The page process failed to start',
        'integrity-failure': 'The page failed an integrity check',
      }

      setLoadError(label[reason] || `The page process ended (${reason})`)
    }

    const onUnresponsive = () => {
      console.warn('[BrowserPane] webview became unresponsive')

      // Give the page a grace period before showing an error.
      // If it recovers within 5 s the timer is cancelled by `onResponsive`.
      if (unresponsiveTimer) clearTimeout(unresponsiveTimer)
      unresponsiveTimer = setTimeout(() => {
        unresponsiveTimer = null
        unresponsiveErrorShown = true
        setLoadError('The page is not responding. You can wait or press Retry to reload.')
      }, 5_000)
    }

    const onResponsive = () => {
      // Page recovered -- clear the warning (if shown) and cancel the grace timer.
      if (unresponsiveTimer) {
        clearTimeout(unresponsiveTimer)
        unresponsiveTimer = null
      }
      if (unresponsiveErrorShown) {
        unresponsiveErrorShown = false
        setLoadError(null)
      }
    }

    const handleNavUpdate = () => {
      const currentUrl = wv.getURL()
      // Don't track about:blank -- transient placeholder for localhost probing
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
    wv.addEventListener('render-process-gone', onRenderProcessGone)
    wv.addEventListener('unresponsive', onUnresponsive)
    wv.addEventListener('responsive', onResponsive)

    return () => {
      if (unresponsiveTimer) clearTimeout(unresponsiveTimer)
      wv.removeEventListener('dom-ready', onDomReady)
      wv.removeEventListener('did-start-loading', onDidStartLoading)
      wv.removeEventListener('did-stop-loading', onDidStopLoading)
      wv.removeEventListener('did-fail-load', onDidFailLoad)
      wv.removeEventListener('did-navigate', onDidNavigate)
      wv.removeEventListener('did-navigate', handleNavUpdate)
      wv.removeEventListener('did-navigate-in-page', handleNavUpdate)
      wv.removeEventListener('console-message', handleConsoleMessage)
      wv.removeEventListener('render-process-gone', onRenderProcessGone)
      wv.removeEventListener('unresponsive', onUnresponsive)
      wv.removeEventListener('responsive', onResponsive)
    }
  }, [
    webviewRef, readyRef, lastNavigatedRef,
    setLoading, setLoadError, setAddressBarValue, setCanGoBack, setCanGoForward,
    onPickElement, onUrlChange,
  ])
}
