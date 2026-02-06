/**
 * BrowserNavBar — navigation controls for the embedded browser pane.
 *
 * Renders back/forward/refresh buttons, address bar, loading indicator,
 * element picker toggle, and view mode buttons (PiP, fullscreen, split).
 */

import React from 'react'
import type { BrowserViewMode } from '@shared/types'

interface BrowserNavBarProps {
  viewMode: BrowserViewMode
  addressBarValue: string
  canGoBack: boolean
  canGoForward: boolean
  loading: boolean
  pickerActive: boolean
  onAddressBarChange: (value: string) => void
  onAddressKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onBack: () => void
  onForward: () => void
  onRefresh: () => void
  onTogglePicker: () => void
  onChangeViewMode?: (mode: BrowserViewMode) => void
}

export function BrowserNavBar({
  viewMode,
  addressBarValue,
  canGoBack,
  canGoForward,
  loading,
  pickerActive,
  onAddressBarChange,
  onAddressKeyDown,
  onBack,
  onForward,
  onRefresh,
  onTogglePicker,
  onChangeViewMode,
}: BrowserNavBarProps) {
  return (
    <div className={`browser-toolbar${viewMode === 'pip' ? ' browser-toolbar--pip' : ''}`}>
      <button type="button" className="browser-nav-btn" onClick={onBack} disabled={!canGoBack} title="Back">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3L5 8l5 5" />
        </svg>
      </button>
      <button type="button" className="browser-nav-btn" onClick={onForward} disabled={!canGoForward} title="Forward">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3l5 5-5 5" />
        </svg>
      </button>
      <button type="button" className="browser-nav-btn" onClick={onRefresh} title="Refresh">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13.5 8a5.5 5.5 0 11-1.4-3.7" />
          <path d="M13.5 3v4h-4" />
        </svg>
      </button>

      <input
        className="browser-address-bar"
        type="text"
        value={addressBarValue}
        onChange={(e) => onAddressBarChange(e.target.value)}
        onKeyDown={onAddressKeyDown}
        spellCheck={false}
        autoComplete="off"
      />

      {loading && <span className="browser-loading-indicator" />}

      <button
        type="button"
        className={`browser-picker-btn${pickerActive ? ' browser-picker-btn--active' : ''}`}
        onClick={onTogglePicker}
        title={pickerActive ? 'Cancel picker' : 'Pick element'}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l4.5 10 1.8-4.2L13.5 7z" />
          <path d="M10 10l3.5 3.5" />
        </svg>
      </button>

      {onChangeViewMode && viewMode !== 'pip' && (
        <button type="button" className="browser-view-btn" onClick={() => onChangeViewMode('pip')} title="Mini window">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="14" height="10" rx="1.5" />
            <rect x="8" y="6" width="6" height="4" rx="1" fill="currentColor" />
          </svg>
        </button>
      )}

      {onChangeViewMode && viewMode === 'fullscreen' ? (
        <button type="button" className="browser-view-btn" onClick={() => onChangeViewMode('split')} title="Exit fullscreen">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2v4H2M10 14v-4h4M14 2l-4 4M2 14l4-4" />
          </svg>
        </button>
      ) : onChangeViewMode && viewMode !== 'pip' ? (
        <button type="button" className="browser-view-btn" onClick={() => onChangeViewMode('fullscreen')} title="Fullscreen">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6V2h4M14 10v4h-4M14 2l-5 5M2 14l5-5" />
          </svg>
        </button>
      ) : null}

      {onChangeViewMode && viewMode === 'pip' && (
        <button type="button" className="browser-view-btn" onClick={() => onChangeViewMode('split')} title="Expand">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6V2h4M14 10v4h-4M14 2l-5 5M2 14l5-5" />
          </svg>
        </button>
      )}
    </div>
  )
}
