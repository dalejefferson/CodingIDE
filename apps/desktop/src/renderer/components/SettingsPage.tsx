import { useState } from 'react'
import { PALETTE_IDS, PALETTES, PALETTE_LABELS, FONT_IDS, FONT_LABELS } from '@shared/themes'
import type { PaletteId, FontId } from '@shared/themes'
import '../styles/SettingsPage.css'

interface SettingsPageProps {
  palette: PaletteId
  font: FontId
  onSelectPalette: (id: PaletteId) => void
  onSelectFont: (id: FontId) => void
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')

export function SettingsPage({ palette, font, onSelectPalette, onSelectFont }: SettingsPageProps) {
  const [showPalettes, setShowPalettes] = useState(false)
  const [showFonts, setShowFonts] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  return (
    <div className="settings-page">
      <h2 className="settings-page-title">Settings</h2>

      <section className="settings-section">
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => setShowPalettes((v) => !v)}
        >
          <svg
            className={`settings-toggle-chevron${showPalettes ? ' settings-toggle-chevron--open' : ''}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 2L8 6L4 10" />
          </svg>
          <h3 className="settings-section-title">Color Palette</h3>
        </button>
        {showPalettes && (
          <>
            <p className="settings-section-hint">
              Choose a palette or press T to cycle through them.
            </p>

            <div className="settings-palette-grid">
              {PALETTE_IDS.map((id) => {
                const tokens = PALETTES[id]
                const isActive = id === palette
                return (
                  <button
                    key={id}
                    className={`settings-palette-card${isActive ? ' settings-palette-card--active' : ''}`}
                    type="button"
                    onClick={() => onSelectPalette(id)}
                    aria-pressed={isActive}
                  >
                    <span className="settings-swatch-row">
                      {tokens.swatch.map((color, i) => (
                        <span
                          key={i}
                          className="settings-swatch-dot"
                          style={{ background: color }}
                        />
                      ))}
                    </span>
                    <span className="settings-palette-name">{PALETTE_LABELS[id]}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="settings-section">
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => setShowFonts((v) => !v)}
        >
          <svg
            className={`settings-toggle-chevron${showFonts ? ' settings-toggle-chevron--open' : ''}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 2L8 6L4 10" />
          </svg>
          <h3 className="settings-section-title">Font</h3>
        </button>
        {showFonts && (
          <>
            <p className="settings-section-hint">Applied across the entire application.</p>

            <select
              id="settings-font-select"
              className="settings-font-select"
              value={font}
              onChange={(e) => onSelectFont(e.target.value as FontId)}
            >
              {FONT_IDS.map((id) => (
                <option key={id} value={id}>
                  {FONT_LABELS[id]}
                </option>
              ))}
            </select>
          </>
        )}
      </section>

      <section className="settings-section">
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => setShowShortcuts((v) => !v)}
        >
          <svg
            className={`settings-toggle-chevron${showShortcuts ? ' settings-toggle-chevron--open' : ''}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 2L8 6L4 10" />
          </svg>
          <h3 className="settings-section-title">Keyboard Shortcuts</h3>
        </button>
        {showShortcuts && (
          <>
            <p className="settings-section-hint">Available throughout the application.</p>

            <div className="settings-shortcuts-list">
              <div className="settings-shortcut-row">
                <kbd className="settings-kbd">{isMac ? '⌘' : 'Ctrl'}</kbd>
                <span className="settings-kbd-plus">+</span>
                <kbd className="settings-kbd">N</kbd>
                <span className="settings-shortcut-label">New project (open folder)</span>
              </div>
              <div className="settings-shortcut-row">
                <kbd className="settings-kbd">Shift</kbd>
                <span className="settings-kbd-plus">+</span>
                <kbd className="settings-kbd">Tab</kbd>
                <span className="settings-shortcut-label">Cycle through projects</span>
              </div>
              <div className="settings-shortcut-row">
                <kbd className="settings-kbd">{isMac ? '⌘' : 'Ctrl'}</kbd>
                <span className="settings-kbd-plus">+</span>
                <kbd className="settings-kbd">B</kbd>
                <span className="settings-shortcut-label">Toggle sidebar</span>
              </div>
              <div className="settings-shortcut-row">
                <kbd className="settings-kbd">{isMac ? '⌘' : 'Ctrl'}</kbd>
                <span className="settings-kbd-plus">+</span>
                <kbd className="settings-kbd">P</kbd>
                <span className="settings-shortcut-label">Run command preset</span>
              </div>
              <div className="settings-shortcut-row">
                <kbd className="settings-kbd">T</kbd>
                <span className="settings-shortcut-label">Cycle color palette</span>
              </div>
              <div className="settings-shortcut-row">
                <kbd className="settings-kbd">F</kbd>
                <span className="settings-shortcut-label">Cycle font</span>
              </div>
              <div className="settings-shortcut-row">
                <kbd className="settings-kbd">{isMac ? '⌘' : 'Ctrl'}</kbd>
                <span className="settings-kbd-plus">+</span>
                <kbd className="settings-kbd">D</kbd>
                <span className="settings-shortcut-label">Split terminal right</span>
              </div>
              <div className="settings-shortcut-row">
                <kbd className="settings-kbd">Shift</kbd>
                <span className="settings-kbd-plus">+</span>
                <kbd className="settings-kbd">{isMac ? '⌘' : 'Ctrl'}</kbd>
                <span className="settings-kbd-plus">+</span>
                <kbd className="settings-kbd">D</kbd>
                <span className="settings-shortcut-label">Split terminal down</span>
              </div>
              <div className="settings-shortcut-row">
                <kbd className="settings-kbd">{isMac ? '⌘' : 'Ctrl'}</kbd>
                <span className="settings-kbd-plus">+</span>
                <kbd className="settings-kbd">W</kbd>
                <span className="settings-shortcut-label">Close terminal pane</span>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
