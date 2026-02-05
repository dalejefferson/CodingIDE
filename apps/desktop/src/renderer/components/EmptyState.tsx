import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import type { Project } from '@shared/types'
import type { WordVomitGen } from '../hooks/usePrdGeneration'
import '../styles/EmptyState.css'

interface EmptyStateProps {
  onOpenFolder: () => void
  onCreateProject: (name: string) => void
  projects?: Project[]
  onSelectProject?: (id: string) => void
  onOpenKanban?: () => void
  onOpenAppBuilder?: () => void
  onWordVomitToRalph?: (rawIdea: string, prdContent: string) => Promise<void>
  onWordVomitToApp?: (prdContent: string) => void
  onWordVomitToProject?: (name: string, rawIdea: string, prdContent: string) => Promise<void>
  wordVomitGen?: WordVomitGen | null
  onStartWordVomitGen?: (rawIdea: string) => void
  onClearWordVomitGen?: () => void
}

interface SuggestionCard {
  icon: ReactNode
  label: string
  onClick?: () => void
}

const TerminalIcon = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="empty-state__hero-icon"
  >
    <rect x="4" y="6" width="32" height="28" rx="4" />
    <polyline points="12,18 18,22 12,26" />
    <line x1="22" y1="26" x2="28" y2="26" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="empty-state__chevron"
  >
    <polyline points="3.5,5.25 7,8.75 10.5,5.25" />
  </svg>
)

const FolderOpenIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v1" />
    <path d="M20.27 10.73A2 2 0 0 0 18.64 10H5.36a2 2 0 0 0-1.95 2.45l1.2 6A2 2 0 0 0 6.56 20h10.88a2 2 0 0 0 1.95-1.55l1.2-6a2 2 0 0 0-.32-1.72z" />
  </svg>
)

const PlusIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
)

const LoopIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
)

const PhoneIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="1.5" width="12" height="21" rx="3" />
    <line x1="10.5" y1="18" x2="13.5" y2="18" />
  </svg>
)

const LightbulbIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
  </svg>
)

type WordVomitPhase = 'idle' | 'input' | 'generating' | 'review' | 'accepting' | 'choose'

export default function EmptyState({
  onOpenFolder,
  onCreateProject,
  projects = [],
  onSelectProject,
  onOpenKanban,
  onOpenAppBuilder,
  onWordVomitToRalph,
  onWordVomitToApp,
  onWordVomitToProject,
  wordVomitGen,
  onStartWordVomitGen,
  onClearWordVomitGen,
}: EmptyStateProps) {
  const [showNameInput, setShowNameInput] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Word Vomit state — initialize from parent generation if active
  const [wvPhase, setWvPhase] = useState<WordVomitPhase>(() => {
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

  // Sync local state when parent generation state changes (e.g. generation completes)
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

  useEffect(() => {
    if (showNameInput) {
      inputRef.current?.focus()
    }
  }, [showNameInput])

  useEffect(() => {
    if (wvPhase === 'input') {
      wvTextareaRef.current?.focus()
    }
  }, [wvPhase])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!pickerOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    // Use a rAF so the opening click doesn't immediately close it
    const id = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside)
    })
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [pickerOpen])

  // Close on Escape
  useEffect(() => {
    if (!pickerOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setPickerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [pickerOpen])

  const handlePickerToggle = useCallback(() => {
    setPickerOpen((prev) => !prev)
  }, [])

  const handleSelectProject = useCallback(
    (id: string) => {
      setPickerOpen(false)
      onSelectProject?.(id)
    },
    [onSelectProject],
  )

  // Sort projects by most recently added (newest first)
  const sortedProjects = [...projects].sort((a, b) => b.addedAt - a.addedAt)

  const handleCreateClick = () => {
    setShowNameInput(true)
    setProjectName('')
  }

  const handleNameSubmit = () => {
    const trimmed = projectName.trim()
    if (!trimmed) return
    setShowNameInput(false)
    setProjectName('')
    onCreateProject(trimmed)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setShowNameInput(false)
      setProjectName('')
    }
  }

  // ── Word Vomit handlers ──────────────────────────────────

  const handleWordVomitClick = useCallback(() => {
    setWvPhase('input')
    setWvRawIdea('')
    setWvPrdContent('')
    setWvError('')
    setWvProjectName('')
    setWvShowProjectInput(false)
  }, [])

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

  const suggestions: SuggestionCard[] = [
    { icon: <FolderOpenIcon />, label: 'Open Existing Project', onClick: onOpenFolder },
    { icon: <PlusIcon />, label: 'Create a New Project', onClick: handleCreateClick },
    { icon: <LoopIcon />, label: 'Ralph Loop', onClick: onOpenKanban },
    { icon: <PhoneIcon />, label: 'Build a Mobile App', onClick: onOpenAppBuilder },
    { icon: <LightbulbIcon />, label: 'Word Vomit', onClick: handleWordVomitClick },
  ]

  return (
    <div className="empty-state">
      <TerminalIcon />

      <h1 className="empty-state__headline">Let&rsquo;s build</h1>

      <p className="empty-state__subtitle">
        in{' '}
        <span ref={pickerRef} className="empty-state__project-picker-wrap">
          <span
            className={`empty-state__project-picker${pickerOpen ? ' empty-state__project-picker--open' : ''}`}
            onClick={handlePickerToggle}
          >
            CodingIDE
            <ChevronDownIcon />
          </span>
          {pickerOpen && (
            <div className="empty-state__dropdown">
              {sortedProjects.length > 0 ? (
                sortedProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="empty-state__dropdown-item"
                    onClick={() => handleSelectProject(p.id)}
                  >
                    <span className="empty-state__dropdown-name">{p.name}</span>
                    <span className="empty-state__dropdown-path">{p.path}</span>
                  </button>
                ))
              ) : (
                <div className="empty-state__dropdown-empty">No recent projects</div>
              )}
            </div>
          )}
        </span>
      </p>

      {showNameInput && (
        <div className="empty-state__name-input-row">
          <input
            ref={inputRef}
            className="empty-state__name-input"
            type="text"
            placeholder="Project name..."
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={handleNameKeyDown}
          />
          <button
            className="empty-state__name-submit"
            type="button"
            onClick={handleNameSubmit}
            disabled={!projectName.trim()}
          >
            Create
          </button>
          <button
            className="empty-state__name-cancel"
            type="button"
            onClick={() => {
              setShowNameInput(false)
              setProjectName('')
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="empty-state__cards">
        {suggestions.map((card) => (
          <button
            key={card.label}
            className="empty-state__card"
            type="button"
            onClick={card.onClick}
          >
            <span className="empty-state__card-icon">{card.icon}</span>
            <span className="empty-state__card-label">{card.label}</span>
          </button>
        ))}
      </div>

      {/* Word Vomit Flow */}
      {wvPhase !== 'idle' && (
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
                <div className="empty-state__wv-choose-cards">
                  <button
                    className="empty-state__card"
                    onClick={handleWvToRalph}
                    disabled={wvPhase === 'accepting'}
                  >
                    <span className="empty-state__card-icon">
                      <LoopIcon />
                    </span>
                    <span className="empty-state__card-label">Ralph Loop</span>
                  </button>
                  <button
                    className="empty-state__card"
                    onClick={handleWvToApp}
                    disabled={wvPhase === 'accepting'}
                  >
                    <span className="empty-state__card-icon">
                      <PhoneIcon />
                    </span>
                    <span className="empty-state__card-label">Build an App</span>
                  </button>
                  <button
                    className="empty-state__card"
                    onClick={() => setWvShowProjectInput(true)}
                    disabled={wvPhase === 'accepting'}
                  >
                    <span className="empty-state__card-icon">
                      <PlusIcon />
                    </span>
                    <span className="empty-state__card-label">Start a Project</span>
                  </button>
                </div>
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
      )}
    </div>
  )
}
