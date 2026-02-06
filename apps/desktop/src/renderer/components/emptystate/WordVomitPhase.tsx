import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { WordVomitGen } from '../../hooks/usePrdGeneration'
import { ChooseActionCards } from './ChooseActionCards'

export type WordVomitPhaseType = 'idle' | 'input' | 'generating' | 'review' | 'accepting' | 'choose'

interface WordVomitFlowProps {
  wordVomitGen?: WordVomitGen | null
  onStartWordVomitGen?: (rawIdea: string) => void
  onClearWordVomitGen?: () => void
  onWordVomitToRalph?: (rawIdea: string, prdContent: string) => Promise<void>
  onWordVomitToApp?: (prdContent: string) => void
  onWordVomitToProject?: (name: string, rawIdea: string, prdContent: string) => Promise<void>
  /** Called externally to set phase to 'input' and reset state */
  active: boolean
  onPhaseChange: (phase: WordVomitPhaseType) => void
}

export const WordVomitFlow = React.memo(function WordVomitFlow({
  wordVomitGen,
  onStartWordVomitGen,
  onClearWordVomitGen,
  onWordVomitToRalph,
  onWordVomitToApp,
  onWordVomitToProject,
  active,
  onPhaseChange,
}: WordVomitFlowProps) {
  const [wvPhase, setWvPhase] = useState<WordVomitPhaseType>(() => {
    if (!wordVomitGen) return 'idle'
    if (wordVomitGen.status === 'generating') return 'generating'
    if (wordVomitGen.status === 'done') return 'review'
    if (wordVomitGen.status === 'error') return 'input'
    return 'idle'
  })
  const [wvRawIdea, setWvRawIdea] = useState(wordVomitGen?.rawIdea ?? '')
  const [wvPrdContent, setWvPrdContent] = useState(wordVomitGen?.result ?? '')
  const [wvError, setWvError] = useState(wordVomitGen?.error ?? '')
  const [wvProjectName, setWvProjectName] = useState('')
  const [wvShowProjectInput, setWvShowProjectInput] = useState(false)
  const wvTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync local state when parent generation state changes
  useEffect(() => {
    if (!wordVomitGen) return
    if (wordVomitGen.status === 'done' && wvPhase === 'generating') {
      setWvPrdContent(wordVomitGen.result ?? '')
      setWvPhase('review')
    }
    if (wordVomitGen.status === 'error' && wvPhase === 'generating') {
      setWvError(wordVomitGen.error ?? '')
      setWvPhase('input')
    }
  }, [wordVomitGen, wvPhase])

  // Focus textarea when entering input phase
  useEffect(() => {
    if (wvPhase === 'input') {
      wvTextareaRef.current?.focus()
    }
  }, [wvPhase])

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange(wvPhase)
  }, [wvPhase, onPhaseChange])

  // When parent activates the flow
  useEffect(() => {
    if (active && wvPhase === 'idle') {
      setWvPhase('input')
      setWvRawIdea('')
      setWvPrdContent('')
      setWvError('')
      setWvProjectName('')
      setWvShowProjectInput(false)
    }
  }, [active, wvPhase])

  const handleWvGenerate = useCallback(() => {
    if (!wvRawIdea.trim()) return
    setWvPhase('generating')
    setWvError('')
    onStartWordVomitGen?.(wvRawIdea.trim())
  }, [wvRawIdea, onStartWordVomitGen])

  const handleWvAccept = useCallback(() => {
    setWvPhase('choose')
  }, [])

  const handleWvRegenerate = useCallback(() => {
    setWvPhase('generating')
    setWvError('')
    onStartWordVomitGen?.(wvRawIdea.trim())
  }, [wvRawIdea, onStartWordVomitGen])

  const handleWvCancel = useCallback(() => {
    setWvPhase('idle')
    setWvRawIdea('')
    setWvPrdContent('')
    setWvError('')
    setWvProjectName('')
    setWvShowProjectInput(false)
    onClearWordVomitGen?.()
  }, [onClearWordVomitGen])

  const handleWvToRalph = useCallback(async () => {
    setWvPhase('accepting')
    try {
      await onWordVomitToRalph?.(wvRawIdea, wvPrdContent)
      setWvPhase('idle')
      onClearWordVomitGen?.()
    } catch {
      setWvPhase('choose')
    }
  }, [wvRawIdea, wvPrdContent, onWordVomitToRalph, onClearWordVomitGen])

  const handleWvToApp = useCallback(() => {
    onWordVomitToApp?.(wvPrdContent)
    setWvPhase('idle')
    onClearWordVomitGen?.()
  }, [wvPrdContent, onWordVomitToApp, onClearWordVomitGen])

  const handleWvToProject = useCallback(async () => {
    if (!wvProjectName.trim()) return
    setWvPhase('accepting')
    try {
      await onWordVomitToProject?.(wvProjectName.trim(), wvRawIdea, wvPrdContent)
      setWvPhase('idle')
      onClearWordVomitGen?.()
    } catch {
      setWvPhase('choose')
    }
  }, [wvRawIdea, wvPrdContent, wvProjectName, onWordVomitToProject, onClearWordVomitGen])

  if (wvPhase === 'idle') return null

  return (
    <div className="empty-state__wv">
      {/* Phase: Input */}
      {(wvPhase === 'input' || wvPhase === 'generating') && (
        <div className="empty-state__wv-input">
          <textarea
            ref={wvTextareaRef}
            className="empty-state__wv-textarea"
            value={wvRawIdea}
            onChange={(e) => setWvRawIdea(e.target.value)}
            placeholder="Just dump your idea here... don't think, just type"
            rows={6}
            disabled={wvPhase === 'generating'}
            style={{ fontFamily: 'inherit' }}
          />
          {wvPhase === 'generating' && (
            <div className="empty-state__wv-loading">
              <span className="empty-state__wv-spinner" />
              Generating PRD...
            </div>
          )}
          {wvError && <p className="empty-state__wv-error">{wvError}</p>}
          <div className="empty-state__wv-actions">
            <button
              className="empty-state__wv-btn empty-state__wv-btn--primary"
              onClick={handleWvGenerate}
              disabled={!wvRawIdea.trim() || wvPhase === 'generating'}
            >
              Generate PRD
            </button>
            <button
              className="empty-state__wv-btn empty-state__wv-btn--cancel"
              onClick={handleWvCancel}
              disabled={wvPhase === 'generating'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Phase: Review */}
      {wvPhase === 'review' && (
        <div className="empty-state__wv-review">
          <textarea
            className="empty-state__wv-textarea empty-state__wv-textarea--prd"
            value={wvPrdContent}
            onChange={(e) => setWvPrdContent(e.target.value)}
            rows={14}
            style={{ fontFamily: 'var(--font-mono, monospace)' }}
          />
          {wvError && <p className="empty-state__wv-error">{wvError}</p>}
          <div className="empty-state__wv-actions">
            <button
              className="empty-state__wv-btn empty-state__wv-btn--primary"
              onClick={handleWvAccept}
            >
              Accept PRD
            </button>
            <button
              className="empty-state__wv-btn empty-state__wv-btn--secondary"
              onClick={handleWvRegenerate}
            >
              Regenerate
            </button>
            <button
              className="empty-state__wv-btn empty-state__wv-btn--cancel"
              onClick={handleWvCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Phase: Choose Action */}
      {(wvPhase === 'choose' || wvPhase === 'accepting') && (
        <div className="empty-state__wv-choose">
          <p className="empty-state__wv-choose-label">What do you want to do with this PRD?</p>
          {!wvShowProjectInput ? (
            <ChooseActionCards
              disabled={wvPhase === 'accepting'}
              onRalph={handleWvToRalph}
              onApp={handleWvToApp}
              onProject={() => setWvShowProjectInput(true)}
            />
          ) : (
            <div className="empty-state__name-input-row">
              <input
                className="empty-state__name-input"
                type="text"
                placeholder="Project name..."
                value={wvProjectName}
                onChange={(e) => setWvProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleWvToProject()
                  } else if (e.key === 'Escape') {
                    setWvShowProjectInput(false)
                    setWvProjectName('')
                  }
                }}
                autoFocus
                disabled={wvPhase === 'accepting'}
              />
              <button
                className="empty-state__name-submit"
                onClick={handleWvToProject}
                disabled={!wvProjectName.trim() || wvPhase === 'accepting'}
              >
                Create
              </button>
              <button
                className="empty-state__name-cancel"
                onClick={() => {
                  setWvShowProjectInput(false)
                  setWvProjectName('')
                }}
                disabled={wvPhase === 'accepting'}
              >
                Back
              </button>
            </div>
          )}
          {wvPhase === 'accepting' && (
            <div className="empty-state__wv-loading">
              <span className="empty-state__wv-spinner" />
              Setting up...
            </div>
          )}
          <div className="empty-state__wv-actions" style={{ marginTop: '12px' }}>
            <button
              className="empty-state__wv-btn empty-state__wv-btn--secondary"
              onClick={() => setWvPhase('review')}
              disabled={wvPhase === 'accepting'}
            >
              Edit PRD
            </button>
            <button
              className="empty-state__wv-btn empty-state__wv-btn--cancel"
              onClick={handleWvCancel}
              disabled={wvPhase === 'accepting'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
