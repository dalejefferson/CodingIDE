import { useState, useCallback, useRef, useEffect } from 'react'
import type { ExpoTemplate } from '@shared/types'
import type { MobilePrdGen } from '../../hooks/usePrdGeneration'
import { CreateAppStep1 } from './CreateAppStep1'
import { CreateAppStep2 } from './CreateAppStep2'
import '../../styles/CreateAppModal.css'

interface CreateAppModalProps {
  onClose: () => void
  onCreate: (
    name: string,
    template: ExpoTemplate,
    parentDir: string,
    prdContent?: string,
    paletteId?: string,
    imagePaths?: string[],
  ) => Promise<void>
  hasApiKey?: boolean
  onGeneratePRD?: (
    description: string,
    template: ExpoTemplate,
    paletteId?: string,
  ) => Promise<{ content: string }>
  initialPrdContent?: string
  mobilePrdGen?: MobilePrdGen | null
  onStartMobilePrdGen?: (description: string, template: ExpoTemplate, paletteId?: string) => void
  onClearMobilePrdGen?: () => void
}

export function CreateAppModal({
  onClose,
  onCreate,
  hasApiKey = false,
  onGeneratePRD,
  initialPrdContent,
  mobilePrdGen,
  onStartMobilePrdGen,
  onClearMobilePrdGen,
}: CreateAppModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [template, setTemplate] = useState<ExpoTemplate>('blank')
  const [parentDir, setParentDir] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overlayRef = useRef<HTMLDivElement>(null)

  // ── Escape key ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // ── Overlay click ─────────────────────────────────────────────
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose()
    },
    [onClose],
  )

  // ── Directory chooser ─────────────────────────────────────────
  const handleChooseDir = useCallback(async () => {
    try {
      const dir = await window.electronAPI.expo.chooseParentDir()
      if (dir) setParentDir(dir)
    } catch (err) {
      console.error('Failed to choose directory:', err)
    }
  }, [])

  // ── Validation ────────────────────────────────────────────────
  const isValidName = name.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(name.trim())
  const canProceed = isValidName && parentDir.length > 0 && !creating

  // ── Create without PRD (from step 1 or step 2 skip) ──────────
  const handleCreateBasic = useCallback(async () => {
    if (!canProceed) return
    setCreating(true)
    setError(null)
    try {
      await onCreate(name.trim(), template, parentDir)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create app')
      setCreating(false)
    }
  }, [canProceed, name, template, parentDir, onCreate])

  // ── Create with PRD (from step 2) ────────────────────────────
  const handleCreateWithPRD = useCallback(
    async (prdContent: string, paletteId: string | null, imagePaths: string[]) => {
      if (!canProceed) return
      setCreating(true)
      setError(null)
      try {
        await onCreate(
          name.trim(),
          template,
          parentDir,
          prdContent || undefined,
          paletteId ?? undefined,
          imagePaths.length > 0 ? imagePaths : undefined,
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create app')
        setCreating(false)
      }
    },
    [canProceed, name, template, parentDir, onCreate],
  )

  // ── Default PRD generator stub ────────────────────────────────
  const defaultGeneratePRD = useCallback(
    async (_desc: string, _tpl: ExpoTemplate, _pid?: string) => {
      return { content: '' }
    },
    [],
  )

  const heading = step === 1 ? 'New Mobile App' : 'App Details (Optional)'

  return (
    <div
      ref={overlayRef}
      className="create-app-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="create-app-modal"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        style={{ fontFamily: 'inherit' }}
      >
        {/* ── Step indicator dots ──────────────────────────────── */}
        <div className="create-app-steps">
          <span
            className={`create-app-step-dot${step === 1 ? ' create-app-step-dot--active' : ''}`}
          />
          <span
            className={`create-app-step-dot${step === 2 ? ' create-app-step-dot--active' : ''}`}
          />
        </div>

        <h2 className="create-app-heading" style={{ fontFamily: 'inherit' }}>
          {heading}
        </h2>

        {error && <div className="create-app-error">{error}</div>}

        {step === 1 ? (
          <CreateAppStep1
            name={name}
            template={template}
            parentDir={parentDir}
            onNameChange={setName}
            onTemplateChange={setTemplate}
            onChooseDir={handleChooseDir}
            onNext={() => setStep(2)}
            onCreateWithoutPRD={handleCreateBasic}
            canProceed={canProceed}
            creating={creating}
          />
        ) : (
          <CreateAppStep2
            template={template}
            hasApiKey={hasApiKey}
            onBack={() => setStep(1)}
            onSkip={handleCreateBasic}
            onCreate={handleCreateWithPRD}
            onGeneratePRD={onGeneratePRD ?? defaultGeneratePRD}
            creating={creating}
            initialPrdContent={initialPrdContent}
            mobilePrdGen={mobilePrdGen}
            onStartMobilePrdGen={onStartMobilePrdGen}
            onClearMobilePrdGen={onClearMobilePrdGen}
          />
        )}
      </div>
    </div>
  )
}
