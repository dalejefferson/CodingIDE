import { useState, useCallback, type ReactNode } from 'react'
import type { Project } from '@shared/types'
import type { WordVomitGen } from '../hooks/usePrdGeneration'
import {
  TerminalIcon,
  FolderOpenIcon,
  PlusIcon,
  LoopIcon,
  PhoneIcon,
  LightbulbIcon,
} from './emptystate/EmptyStateIcons'
import { ProjectPicker } from './emptystate/ProjectPicker'
import { NameInputForm } from './emptystate/NameInputForm'
import { WordVomitFlow } from './emptystate/WordVomitPhase'
import type { WordVomitPhaseType } from './emptystate/WordVomitPhase'
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
  const [wvActive, setWvActive] = useState(false)
  const [wvPhase, setWvPhase] = useState<WordVomitPhaseType>('idle')

  const handleCreateClick = useCallback(() => {
    setShowNameInput(true)
  }, [])

  const handleNameSubmit = useCallback(
    (name: string) => {
      setShowNameInput(false)
      onCreateProject(name)
    },
    [onCreateProject],
  )

  const handleNameCancel = useCallback(() => {
    setShowNameInput(false)
  }, [])

  const handleWordVomitClick = useCallback(() => {
    setWvActive(true)
  }, [])

  const handleWvPhaseChange = useCallback((phase: WordVomitPhaseType) => {
    setWvPhase(phase)
    if (phase === 'idle') {
      setWvActive(false)
    }
  }, [])

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
        <ProjectPicker projects={projects} onSelectProject={onSelectProject} />
      </p>

      <NameInputForm
        visible={showNameInput}
        onSubmit={handleNameSubmit}
        onCancel={handleNameCancel}
      />

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
      {(wvActive || wvPhase !== 'idle') && (
        <WordVomitFlow
          wordVomitGen={wordVomitGen}
          onStartWordVomitGen={onStartWordVomitGen}
          onClearWordVomitGen={onClearWordVomitGen}
          onWordVomitToRalph={onWordVomitToRalph}
          onWordVomitToApp={onWordVomitToApp}
          onWordVomitToProject={onWordVomitToProject}
          active={wvActive}
          onPhaseChange={handleWvPhaseChange}
        />
      )}
    </div>
  )
}
