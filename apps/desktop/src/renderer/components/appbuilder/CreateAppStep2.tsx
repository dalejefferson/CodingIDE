import { useState, useCallback, useEffect } from 'react'
import type { ExpoTemplate } from '@shared/types'
import type { MobilePrdGen } from '../../hooks/usePrdGeneration'
import { MobilePaletteGrid } from './MobilePaletteGrid'
import { ImageUploadArea } from './ImageUploadArea'

interface CreateAppStep2Props {
  template: ExpoTemplate
  hasApiKey: boolean
  onBack: () => void
  onSkip: () => void
  onCreate: (prdContent: string, paletteId: string | null, imagePaths: string[]) => void
  onGeneratePRD: (
    description: string,
    template: ExpoTemplate,
    paletteId?: string,
    imagePaths?: string[],
  ) => Promise<{ content: string }>
  creating: boolean
  initialPrdContent?: string
  mobilePrdGen?: MobilePrdGen | null
  onStartMobilePrdGen?: (
    description: string,
    template: ExpoTemplate,
    paletteId?: string,
    imagePaths?: string[],
  ) => void
  onClearMobilePrdGen?: () => void
}

export function CreateAppStep2({
  template,
  hasApiKey,
  onBack,
  onSkip,
  onCreate,
  onGeneratePRD,
  creating,
  initialPrdContent,
  mobilePrdGen,
  onStartMobilePrdGen,
  onClearMobilePrdGen,
}: CreateAppStep2Props) {
  // Initialize from parent generation result if available
  const [prdContent, setPrdContent] = useState(
    mobilePrdGen?.status === 'done' && mobilePrdGen.result
      ? mobilePrdGen.result
      : (initialPrdContent ?? ''),
  )
  const [appDescription, setAppDescription] = useState('')

  // Pre-fill PRD from Word Vomit flow
  useEffect(() => {
    if (initialPrdContent) {
      setPrdContent(initialPrdContent)
    }
  }, [initialPrdContent])
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])

  // Use parent generation state for "generating" indicator
  const generating = mobilePrdGen?.status === 'generating'

  // Sync result when parent generation completes
  useEffect(() => {
    if (mobilePrdGen?.status === 'done' && mobilePrdGen.result) {
      setPrdContent(mobilePrdGen.result)
      onClearMobilePrdGen?.()
    }
  }, [mobilePrdGen, onClearMobilePrdGen])

  const handleGenerate = useCallback(() => {
    if (!appDescription.trim() || !hasApiKey) return
    const imgPaths = images.length > 0 ? images : undefined
    if (onStartMobilePrdGen) {
      onStartMobilePrdGen(appDescription.trim(), template, selectedPaletteId ?? undefined, imgPaths)
    } else {
      // Fallback to direct call if parent handler not provided
      onGeneratePRD(appDescription.trim(), template, selectedPaletteId ?? undefined, imgPaths)
        .then((result) => setPrdContent(result.content))
        .catch((err) => console.error('Failed to generate PRD:', err))
    }
  }, [
    appDescription,
    hasApiKey,
    template,
    selectedPaletteId,
    images,
    onStartMobilePrdGen,
    onGeneratePRD,
  ])

  const handleCreate = useCallback(() => {
    onCreate(prdContent, selectedPaletteId, images)
  }, [prdContent, selectedPaletteId, images, onCreate])

  const handleAddImages = useCallback((paths: string[]) => {
    setImages((prev) => {
      const combined = [...prev, ...paths]
      return combined.slice(0, 10)
    })
  }, [])

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const canCreate = prdContent.trim().length > 0 && !creating && !generating

  return (
    <div className="create-app-step2">
      {/* ── App Description + Generate ─────────────────────────────── */}
      <label className="create-app-label" style={{ fontFamily: 'inherit' }}>
        Describe your app
        <input
          type="text"
          className="create-app-input"
          value={appDescription}
          onChange={(e) => setAppDescription(e.target.value)}
          placeholder="A fitness tracker with workout logging and progress charts..."
          style={{ fontFamily: 'inherit' }}
        />
      </label>

      <div className="create-app-step2__generate-row">
        <button
          type="button"
          className="create-app-btn create-app-btn-submit"
          disabled={!appDescription.trim() || !hasApiKey || generating}
          onClick={handleGenerate}
          style={{ fontFamily: 'inherit' }}
        >
          {generating ? 'Generating...' : 'Generate PRD'}
        </button>
        {!hasApiKey && (
          <span className="create-app-step2__api-warning">
            API key required. Add one in Settings.
          </span>
        )}
      </div>

      {/* ── PRD Content ────────────────────────────────────────────── */}
      <label className="create-app-label" style={{ fontFamily: 'inherit' }}>
        PRD Content
        <div className="create-app-step2__prd-wrapper">
          <textarea
            className="create-app-input create-app-step2__prd-textarea"
            value={prdContent}
            onChange={(e) => setPrdContent(e.target.value)}
            placeholder="Paste or generate a Product Requirements Document..."
            rows={8}
            disabled={generating}
            style={{ fontFamily: 'inherit' }}
          />
          {generating && (
            <div className="create-app-step2__prd-loading">
              <span className="create-app-step2__prd-spinner" />
              Generating PRD...
            </div>
          )}
        </div>
      </label>

      {/* ── Color Palette ──────────────────────────────────────────── */}
      <div className="create-app-step2__section">
        <span className="create-app-label" style={{ fontFamily: 'inherit' }}>
          Color Palette (optional)
        </span>
        <MobilePaletteGrid selectedId={selectedPaletteId} onSelect={setSelectedPaletteId} />
      </div>

      {/* ── Reference Images ───────────────────────────────────────── */}
      <div className="create-app-step2__section">
        <span className="create-app-label" style={{ fontFamily: 'inherit' }}>
          Reference Images (optional)
        </span>
        <ImageUploadArea images={images} onAdd={handleAddImages} onRemove={handleRemoveImage} />
      </div>

      {/* ── Actions ────────────────────────────────────────────────── */}
      <div className="create-app-actions">
        <button
          type="button"
          className="create-app-btn create-app-btn-cancel"
          onClick={onBack}
          disabled={creating}
          style={{ fontFamily: 'inherit' }}
        >
          Back
        </button>
        <button
          type="button"
          className="create-app-btn create-app-btn-cancel"
          onClick={onSkip}
          disabled={creating}
          style={{ fontFamily: 'inherit' }}
        >
          Skip
        </button>
        <button
          type="button"
          className="create-app-btn create-app-btn-submit"
          disabled={!canCreate}
          onClick={handleCreate}
          style={{ fontFamily: 'inherit' }}
        >
          {creating ? 'Creating...' : 'Create App'}
        </button>
      </div>
    </div>
  )
}
