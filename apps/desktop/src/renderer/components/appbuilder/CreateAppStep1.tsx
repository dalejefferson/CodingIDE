import { useRef, useEffect } from 'react'
import type { ExpoTemplate } from '@shared/types'
import { EXPO_TEMPLATES } from '@shared/types'

const TEMPLATE_DESCRIPTIONS: Record<ExpoTemplate, string> = {
  blank: 'A minimal app with a single screen',
  tabs: 'An app with tab-based navigation',
  drawer: 'An app with drawer (side menu) navigation',
}

interface CreateAppStep1Props {
  name: string
  template: ExpoTemplate
  parentDir: string
  onNameChange: (name: string) => void
  onTemplateChange: (template: ExpoTemplate) => void
  onChooseDir: () => void
  onNext: () => void
  onCreateWithoutPRD: () => void
  canProceed: boolean
  creating: boolean
}

export function CreateAppStep1({
  name,
  template,
  parentDir,
  onNameChange,
  onTemplateChange,
  onChooseDir,
  onNext,
  onCreateWithoutPRD,
  canProceed,
  creating,
}: CreateAppStep1Props) {
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const isValidName = name.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(name.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (canProceed) onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="create-app-form">
      <label className="create-app-label" style={{ fontFamily: 'inherit' }}>
        App Name
        <input
          ref={nameRef}
          type="text"
          className="create-app-input"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
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
          onChange={(e) => onTemplateChange(e.target.value as ExpoTemplate)}
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
            onClick={onChooseDir}
            style={{ fontFamily: 'inherit' }}
          >
            Browse
          </button>
        </div>
      </label>

      <div className="create-app-actions">
        <button
          type="button"
          className="create-app-btn create-app-btn-cancel"
          onClick={onCreateWithoutPRD}
          disabled={!canProceed}
          style={{ fontFamily: 'inherit' }}
        >
          Create without PRD
        </button>
        <button
          type="submit"
          className="create-app-btn create-app-btn-submit"
          disabled={!canProceed || creating}
          style={{ fontFamily: 'inherit' }}
        >
          Next
        </button>
      </div>
    </form>
  )
}
