import React from 'react'
import { LoopIcon, PhoneIcon, PlusIcon } from './EmptyStateIcons'

interface ChooseActionCardsProps {
  disabled: boolean
  onRalph: () => void
  onApp: () => void
  onProject: () => void
}

export const ChooseActionCards = React.memo(function ChooseActionCards({
  disabled,
  onRalph,
  onApp,
  onProject,
}: ChooseActionCardsProps) {
  return (
    <div className="empty-state__wv-choose-cards">
      <button className="empty-state__card" onClick={onRalph} disabled={disabled}>
        <span className="empty-state__card-icon">
          <LoopIcon />
        </span>
        <span className="empty-state__card-label">Ralph Loop</span>
      </button>
      <button className="empty-state__card" onClick={onApp} disabled={disabled}>
        <span className="empty-state__card-icon">
          <PhoneIcon />
        </span>
        <span className="empty-state__card-label">Build an App</span>
      </button>
      <button className="empty-state__card" onClick={onProject} disabled={disabled}>
        <span className="empty-state__card-icon">
          <PlusIcon />
        </span>
        <span className="empty-state__card-label">Start a Project</span>
      </button>
    </div>
  )
})
