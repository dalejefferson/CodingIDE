import { useState, useCallback, useEffect } from 'react'
import { useExpoApps } from '../../hooks/useExpoApps'
import { AppCard } from './AppCard'
import { AppDetailPanel } from './AppDetailPanel'
import { CreateAppModal } from './CreateAppModal'
import type { ExpoTemplate } from '@shared/types'
import type { MobilePrdGen } from '../../hooks/usePrdGeneration'
import '../../styles/AppBuilderPage.css'

interface AppBuilderPageProps {
  onEditAndPreview?: (appId: string) => void
  initialPrdContent?: string | null
  onConsumeInitialPrd?: () => void
  mobilePrdGen?: MobilePrdGen | null
  onStartMobilePrdGen?: (
    description: string,
    template: ExpoTemplate,
    paletteId?: string,
    imagePaths?: string[],
  ) => void
  onClearMobilePrdGen?: () => void
}

export function AppBuilderPage({
  onEditAndPreview,
  initialPrdContent,
  onConsumeInitialPrd,
  mobilePrdGen,
  onStartMobilePrdGen,
  onClearMobilePrdGen,
}: AppBuilderPageProps) {
  const {
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
    apiKeyStatus,
    generatePRD,
  } = useExpoApps()

  const [showCreateModal, setShowCreateModal] = useState(false)

  // Auto-open create modal when Word Vomit passes PRD content
  useEffect(() => {
    if (initialPrdContent) {
      setShowCreateModal(true)
    }
  }, [initialPrdContent])

  const handleOpenExisting = useCallback(async () => {
    try {
      const folderPath = await window.electronAPI.expo.openFolderDialog()
      if (!folderPath) return
      await addApp(folderPath)
    } catch (err) {
      console.error('Failed to open existing Expo project:', err)
    }
  }, [addApp])

  const handleCreate = useCallback(
    async (
      name: string,
      template: ExpoTemplate,
      parentDir: string,
      prdContent?: string,
      paletteId?: string,
      imagePaths?: string[],
    ) => {
      await createApp(name, template, parentDir, prdContent, paletteId, imagePaths)
      setShowCreateModal(false)
    },
    [createApp],
  )

  if (loading) {
    return (
      <div className="app-builder">
        <div className="app-builder__loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="app-builder">
      <div className="app-builder__header">
        <h1 className="app-builder__title">App Builder</h1>
        <div className="app-builder__header-actions">
          <button
            type="button"
            className="app-builder__btn app-builder__btn--primary"
            onClick={() => setShowCreateModal(true)}
          >
            New App
          </button>
          <button
            type="button"
            className="app-builder__btn app-builder__btn--secondary"
            onClick={handleOpenExisting}
          >
            Open Existing
          </button>
        </div>
      </div>

      <div className="app-builder__body">
        {mobileApps.length === 0 ? (
          <div className="app-builder__empty">
            <p className="app-builder__empty-text">
              No mobile apps yet. Create one or open an existing Expo project.
            </p>
          </div>
        ) : (
          <div className="app-builder__grid">
            {mobileApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                selected={app.id === selectedAppId}
                onSelect={selectApp}
                onRemove={removeApp}
              />
            ))}
          </div>
        )}

        {selectedApp && (
          <div className="app-builder__detail">
            <AppDetailPanel
              app={selectedApp}
              onStart={startApp}
              onStop={stopApp}
              onOpenAsProject={openAsProject}
              onEditAndPreview={onEditAndPreview}
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateAppModal
          onClose={() => {
            setShowCreateModal(false)
            onConsumeInitialPrd?.()
            onClearMobilePrdGen?.()
          }}
          onCreate={handleCreate}
          hasApiKey={apiKeyStatus?.hasAny ?? false}
          onGeneratePRD={generatePRD}
          initialPrdContent={initialPrdContent ?? undefined}
          mobilePrdGen={mobilePrdGen}
          onStartMobilePrdGen={onStartMobilePrdGen}
          onClearMobilePrdGen={onClearMobilePrdGen}
        />
      )}
    </div>
  )
}
