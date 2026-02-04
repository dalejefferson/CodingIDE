import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import type { Project } from '@shared/types'
import '../styles/EmptyState.css'

interface EmptyStateProps {
  onOpenFolder: () => void
  onCreateProject: (name: string) => void
  projects?: Project[]
  onSelectProject?: (id: string) => void
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

export default function EmptyState({
  onOpenFolder,
  onCreateProject,
  projects = [],
  onSelectProject,
}: EmptyStateProps) {
  const [showNameInput, setShowNameInput] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showNameInput) {
      inputRef.current?.focus()
    }
  }, [showNameInput])

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

  const suggestions: SuggestionCard[] = [
    { icon: <FolderOpenIcon />, label: 'Open Existing Project', onClick: onOpenFolder },
    { icon: <PlusIcon />, label: 'Create a New Project', onClick: handleCreateClick },
    { icon: <LoopIcon />, label: 'Ralph Loop' },
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
    </div>
  )
}
