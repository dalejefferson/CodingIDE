/**
 * PaneInputBar — unified bottom bar: CWD/branch info + input with terminal/AI toggle.
 *
 * Terminal mode (default): Enter sends command to PTY via onSendCommand.
 * AI mode: placeholder — input does nothing.
 */

import { useState, useCallback, useRef } from 'react'
import '../styles/PaneInputBar.css'

type InputMode = 'terminal' | 'ai'

interface PaneInputBarProps {
  cwd: string
  gitBranch: string | null
  onSendCommand: (command: string) => void
}

/** Replace the user's home directory with ~ for display */
function shortenPath(fullPath: string): string {
  const homeMatch = fullPath.match(/^\/Users\/[^/]+/)
  if (homeMatch) {
    return fullPath.replace(homeMatch[0], '~')
  }
  return fullPath
}

export function PaneInputBar({ cwd, gitBranch, onSendCommand }: PaneInputBarProps) {
  const [mode, setMode] = useState<InputMode>('terminal')
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(() => {
    if (mode === 'terminal' && value.length > 0) {
      onSendCommand(value)
      setValue('')
    }
  }, [mode, value, onSendCommand])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Let global shortcuts (Cmd/Ctrl+key) propagate to App.tsx handler
      if (e.metaKey || e.ctrlKey) return

      // Stop xterm from stealing regular keystrokes
      e.stopPropagation()

      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <div className="pane-input-bar">
      <div className="pane-input-row">
        <div className="pane-input-mode-toggle">
          <button
            type="button"
            className={`pane-input-mode-btn${mode === 'terminal' ? ' pane-input-mode-btn--active' : ''}`}
            onClick={() => {
              setMode('terminal')
              inputRef.current?.focus()
            }}
            title="Terminal mode"
          >
            {'>_'}
          </button>
          <button
            type="button"
            className={`pane-input-mode-btn${mode === 'ai' ? ' pane-input-mode-btn--active' : ''}`}
            onClick={() => {
              setMode('ai')
              inputRef.current?.focus()
            }}
            title="AI mode"
          >
            A
          </button>
        </div>

        <input
          ref={inputRef}
          className="pane-input-field"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'terminal' ? 'Type a command...' : 'Ask AI...'}
          spellCheck={false}
          autoComplete="off"
        />

        <div className="pane-input-tools">
          <button type="button" className="pane-input-tool-btn" title="Attach file">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13.5 7.5l-5.8 5.8a3.5 3.5 0 01-5-5l5.8-5.8a2.3 2.3 0 013.3 3.3L6 11.6a1.2 1.2 0 01-1.7-1.7l5-5" />
            </svg>
          </button>
          <button type="button" className="pane-input-tool-btn" title="Mention">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="3" />
              <path d="M11 8v1.5a2 2 0 004 0V8a6 6 0 10-3 5.2" />
            </svg>
          </button>
        </div>

        <button type="button" className="pane-input-model-picker" title="Model picker">
          auto
        </button>
      </div>
      <div className="pane-input-info">
        <div className="pane-input-cwd">
          <svg
            className="pane-input-info-icon"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 5.5V13a1 1 0 001 1h10a1 1 0 001-1V6.5a1 1 0 00-1-1H8.5L7 4H3a1 1 0 00-1 1.5z" />
          </svg>
          <span className="pane-input-path" title={cwd}>
            {shortenPath(cwd)}
          </span>
        </div>
        {gitBranch && (
          <div className="pane-input-branch">
            <svg
              className="pane-input-info-icon"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="5" cy="4" r="2" />
              <circle cx="5" cy="12" r="2" />
              <circle cx="11" cy="8" r="2" />
              <path d="M5 6v4M9 8H7c-1.1 0-2-.9-2-2" />
            </svg>
            <span className="pane-input-branch-name">{gitBranch}</span>
          </div>
        )}
      </div>
    </div>
  )
}
