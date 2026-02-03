import { PALETTE_IDS, PALETTES, PALETTE_LABELS, FONT_IDS, FONT_LABELS } from '@shared/themes'
import type { PaletteId, FontId } from '@shared/themes'
import '../styles/SettingsPage.css'

interface SettingsPageProps {
  palette: PaletteId
  font: FontId
  onSelectPalette: (id: PaletteId) => void
  onSelectFont: (id: FontId) => void
}

export function SettingsPage({ palette, font, onSelectPalette, onSelectFont }: SettingsPageProps) {
  return (
    <div className="settings-page">
      <h2 className="settings-page-title">Settings</h2>

      <section className="settings-section">
        <h3 className="settings-section-title">Color Palette</h3>
        <p className="settings-section-hint">Choose a palette or press T to cycle through them.</p>

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
                    <span key={i} className="settings-swatch-dot" style={{ background: color }} />
                  ))}
                </span>
                <span className="settings-palette-name">{PALETTE_LABELS[id]}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">Font</h3>
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
      </section>
    </div>
  )
}
