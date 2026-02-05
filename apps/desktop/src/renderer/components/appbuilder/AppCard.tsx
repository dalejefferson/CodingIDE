import React from 'react'
import type { MobileApp } from '@shared/types'

interface AppCardProps {
  app: MobileApp
  selected: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

export const AppCard = React.memo(function AppCard({
  app,
  selected,
  onSelect,
  onRemove,
}: AppCardProps) {
  return (
    <div
      className={`app-card${selected ? ' app-card--selected' : ''}`}
      onClick={() => onSelect(app.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        onRemove(app.id)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(app.id)
        }
      }}
    >
      <div className="app-card__header">
        <span className="app-card__name">{app.name}</span>
        {app.hasPRD && (
          <span className="app-card__prd-badge" title="Has PRD">
            PRD
          </span>
        )}
        <span
          className={`app-card__status-dot app-card__status-dot--${app.status}`}
          title={app.status}
        />
      </div>
      <span className="app-card__template">{app.template}</span>
      <button
        type="button"
        className="app-card__delete-btn"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(app.id)
        }}
        aria-label={`Remove ${app.name}`}
        title={`Remove ${app.name}`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3l6 6M9 3l-6 6" />
        </svg>
      </button>
    </div>
  )
})
