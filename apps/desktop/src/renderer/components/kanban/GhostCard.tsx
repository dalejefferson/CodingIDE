import React from 'react'

interface GhostCardProps {
  onClick: () => void
}

function GhostCardInner({ onClick }: GhostCardProps) {
  return (
    <div
      className="ticket-card ticket-card--ghost-add"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      style={{ fontFamily: 'inherit' }}
    >
      <span className="ghost-card-icon">+</span>
      <span className="ghost-card-label">Add idea</span>
    </div>
  )
}

export const GhostCard = React.memo(GhostCardInner)
