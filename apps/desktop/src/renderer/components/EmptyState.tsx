import type { ReactNode } from 'react'
import '../styles/EmptyState.css'

interface EmptyStateProps {
  onOpenFolder: () => void
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

const RocketIcon = () => (
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
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3" />
  </svg>
)

const WrenchIcon = () => (
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
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

const BookIcon = () => (
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
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="9" y1="7" x2="15" y2="7" />
    <line x1="9" y1="11" x2="13" y2="11" />
  </svg>
)

export default function EmptyState({ onOpenFolder }: EmptyStateProps) {
  const suggestions: SuggestionCard[] = [
    { icon: <RocketIcon />, label: 'Start a new project', onClick: onOpenFolder },
    { icon: <WrenchIcon />, label: 'Configure workspace' },
    { icon: <BookIcon />, label: 'Browse templates' },
  ]

  return (
    <div className="empty-state">
      <TerminalIcon />

      <h1 className="empty-state__headline">Let&rsquo;s build</h1>

      <p className="empty-state__subtitle">
        in{' '}
        <span className="empty-state__project-picker">
          CodingIDE
          <ChevronDownIcon />
        </span>
      </p>

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
