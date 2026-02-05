import { useState, useCallback, useRef, useEffect } from 'react'
import type { ExpoTemplate } from '@shared/types'
import { EXPO_TEMPLATES } from '@shared/types'
import '../../styles/CreateAppModal.css'

interface CreateAppModalProps {
  onClose: () => void
  onCreate: (name: string, template: ExpoTemplate, parentDir: string) => Promise<void>
}

const TEMPLATE_DESCRIPTIONS: Record<ExpoTemplate, string> = {
  blank: 'A minimal app with a single screen',
  tabs: 'An app with tab-based navigation',
  drawer: 'An app with drawer (side menu) navigation',
}

export function CreateAppModal({ onClose, onCreate }: CreateAppModalProps) {
  const [name, setName] = useState('')
  const [template, setTemplate] = useState<ExpoTemplate>('blank')
  const [parentDir, setParentDir] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose()
    },
    [onClose],
  )

  const handleChooseDir = useCallback(async () => {
    try {
      const dir = await window.electronAPI.expo.chooseParentDir()
      if (dir) setParentDir(dir)
    } catch (err) {
      console.error('Failed to choose directory:', err)
    }
  }, [])

  const isValidName = name.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(name.trim())
  const canSubmit = isValidName && parentDir.length > 0 && !creating

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!canSubmit) return

      setCreating(true)
      setError(null)

      try {
        await onCreate(name.trim(), template, parentDir)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create app')
        setCreating(false)
      }
    },
    [canSubmit, name, template, parentDir, onCreate],
  )

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
        aria-label="Create new mobile app"
        style={{ fontFamily: 'inherit' }}
      >
        <h2 className="create-app-heading" style={{ fontFamily: 'inherit' }}>
          New Mobile App
        </h2>

        <form onSubmit={handleSubmit} className="create-app-form">
          <label className="create-app-label" style={{ fontFamily: 'inherit' }}>
            App Name
            <input
              ref={nameRef}
              type="text"
              className="create-app-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-app"
              required
              style={{ fontFamily: 'inherit' }}
            />
            {name.trim().length > 0 && !isValidName && (
              <span className="create-app-validation">
                Only letters, numbers, hyphens, and underscores
              </span>
            )}
          </label>

          <label className="create-app-label" style={{ fontFamily: 'inherit' }}>
            Template
            <select
              className="create-app-select"
              value={template}
              onChange={(e) => setTemplate(e.target.value as ExpoTemplate)}
              style={{ fontFamily: 'inherit' }}
            >
              {EXPO_TEMPLATES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)} — {TEMPLATE_DESCRIPTIONS[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="create-app-label" style={{ fontFamily: 'inherit' }}>
            Location
            <div className="create-app-dir-row">
              <span className="create-app-dir-path" title={parentDir || 'No directory selected'}>
                {parentDir || 'Choose a directory...'}
              </span>
              <button
                type="button"
                className="create-app-dir-btn"
                onClick={handleChooseDir}
                style={{ fontFamily: 'inherit' }}
              >
                Browse
              </button>
            </div>
          </label>

          {error && <div className="create-app-error">{error}</div>}

          <div className="create-app-actions">
            <button
              type="button"
              className="create-app-btn create-app-btn-cancel"
              onClick={onClose}
              disabled={creating}
              style={{ fontFamily: 'inherit' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-app-btn create-app-btn-submit"
              disabled={!canSubmit}
              style={{ fontFamily: 'inherit' }}
            >
              {creating ? 'Creating...' : 'Create App'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
