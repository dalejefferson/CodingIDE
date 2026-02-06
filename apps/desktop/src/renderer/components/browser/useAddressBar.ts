import { useState, useCallback } from 'react'
import { PICKER_SCRIPT, PICKER_CLEANUP_SCRIPT } from './pickerScript'

interface UseAddressBarOpts {
  startUrl: string
  webviewRef: React.MutableRefObject<Electron.WebviewTag | null>
  readyRef: React.MutableRefObject<boolean>
}

export function useAddressBar({ startUrl, webviewRef, readyRef }: UseAddressBarOpts) {
  const [addressBarValue, setAddressBarValue] = useState(startUrl)
  const [pickerActive, setPickerActive] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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
  }, [webviewRef, readyRef])

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
  }, [webviewRef])

  const handleForward = useCallback(() => {
    webviewRef.current?.goForward()
  }, [webviewRef])

  const handleRefresh = useCallback(() => {
    const wv = webviewRef.current
    if (!wv) return
    let url = addressBarValue.trim()
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url
    }
    setLoadError(null)
    wv.loadURL(url)
  }, [addressBarValue, webviewRef])

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
  }, [pickerActive, webviewRef, readyRef])

  return {
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
  }
}
