import { useState, useEffect, useCallback } from 'react'
import type {
  MobileApp,
  ExpoTemplate,
  TemplateStatusResponse,
  APIKeyStatusResponse,
  GenerateMobilePRDResponse,
} from '@shared/types'

export interface UseExpoAppsReturn {
  mobileApps: MobileApp[]
  loading: boolean
  selectedApp: MobileApp | null
  selectedAppId: string | null
  selectApp: (id: string) => void
  createApp: (
    name: string,
    template: ExpoTemplate,
    parentDir: string,
    prdContent?: string,
    paletteId?: string,
    imagePaths?: string[],
  ) => Promise<void>
  addApp: (path: string) => Promise<void>
  removeApp: (id: string) => Promise<void>
  startApp: (appId: string) => Promise<void>
  stopApp: (appId: string) => Promise<void>
  openAsProject: (appId: string) => Promise<void>
  refreshApps: () => Promise<void>
  templateStatus: TemplateStatusResponse | null
  apiKeyStatus: APIKeyStatusResponse | null
  generatePRD: (
    appDescription: string,
    template: ExpoTemplate,
    paletteId?: string,
  ) => Promise<GenerateMobilePRDResponse>
  refreshTemplates: () => Promise<void>
}

export function useExpoApps(): UseExpoAppsReturn {
  const [mobileApps, setMobileApps] = useState<MobileApp[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [templateStatus, setTemplateStatus] = useState<TemplateStatusResponse | null>(null)
  const [apiKeyStatus, setApiKeyStatus] = useState<APIKeyStatusResponse | null>(null)

  // ── Initial load ────────────────────────────────────────────
  const refreshApps = useCallback(async () => {
    try {
      const all = await window.electronAPI.expo.getAll()
      setMobileApps(all)
    } catch (err) {
      console.error('[useExpoApps] Failed to fetch apps:', err)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const all = await window.electronAPI.expo.getAll()
        if (!cancelled) setMobileApps(all)
      } catch (err) {
        console.error('[useExpoApps] Initial load failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Template + API key status on mount ──────────────────────
  useEffect(() => {
    window.electronAPI.expo.getTemplateStatus().then(setTemplateStatus).catch(console.error)
    window.electronAPI.expo.getApiKeyStatus().then(setApiKeyStatus).catch(console.error)
  }, [])

  // ── Broadcast listener ──────────────────────────────────────
  useEffect(() => {
    return window.electronAPI.expo.onStatusChanged((updatedApp: MobileApp) => {
      setMobileApps((prev) => {
        const idx = prev.findIndex((a) => a.id === updatedApp.id)
        if (idx === -1) return [...prev, updatedApp]
        const next = [...prev]
        next[idx] = updatedApp
        return next
      })
    })
  }, [])

  // ── Callbacks ───────────────────────────────────────────────
  const selectApp = useCallback((id: string) => {
    setSelectedAppId(id)
  }, [])

  const createApp = useCallback(
    async (
      name: string,
      template: ExpoTemplate,
      parentDir: string,
      prdContent?: string,
      paletteId?: string,
      imagePaths?: string[],
    ) => {
      const app = await window.electronAPI.expo.create({
        name,
        template,
        parentDir,
        prdContent,
        paletteId,
        imagePaths,
      })
      setMobileApps((prev) => [...prev, app])
      setSelectedAppId(app.id)
    },
    [],
  )

  const addApp = useCallback(async (path: string) => {
    const app = await window.electronAPI.expo.add({ path })
    setMobileApps((prev) => {
      if (prev.some((a) => a.id === app.id)) return prev
      return [...prev, app]
    })
    setSelectedAppId(app.id)
  }, [])

  const removeApp = useCallback(
    async (id: string) => {
      await window.electronAPI.expo.remove(id)
      setMobileApps((prev) => prev.filter((a) => a.id !== id))
      if (selectedAppId === id) setSelectedAppId(null)
    },
    [selectedAppId],
  )

  const startApp = useCallback(async (appId: string) => {
    await window.electronAPI.expo.start({ appId })
  }, [])

  const stopApp = useCallback(async (appId: string) => {
    await window.electronAPI.expo.stop({ appId })
  }, [])

  const openAsProject = useCallback(async (appId: string) => {
    await window.electronAPI.expo.openAsProject({ appId })
  }, [])

  // ── PRD Generation ────────────────────────────────────────────
  const generatePRD = useCallback(
    async (
      appDescription: string,
      template: ExpoTemplate,
      paletteId?: string,
    ): Promise<GenerateMobilePRDResponse> => {
      return window.electronAPI.expo.generatePRD({ appDescription, template, paletteId })
    },
    [],
  )

  // ── Template Refresh ─────────────────────────────────────────
  const refreshTemplates = useCallback(async () => {
    await window.electronAPI.expo.refreshTemplates()
    const status = await window.electronAPI.expo.getTemplateStatus()
    setTemplateStatus(status)
  }, [])

  // ── Derived ─────────────────────────────────────────────────
  const selectedApp = mobileApps.find((a) => a.id === selectedAppId) ?? null

  return {
    mobileApps,
    loading,
    selectedApp,
    selectedAppId,
    selectApp,
    createApp,
    addApp,
    removeApp,
    startApp,
    stopApp,
    openAsProject,
    refreshApps,
    templateStatus,
    apiKeyStatus,
    generatePRD,
    refreshTemplates,
  }
}
