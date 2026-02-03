import { PALETTE_IDS, PALETTES, PALETTE_LABELS, FONT_IDS, FONT_LABELS } from '@shared/themes'
import type { PaletteId, FontId } from '@shared/themes'
import '../styles/SidebarSettings.css'

interface SidebarSettingsProps {
  palette: PaletteId
  font: FontId
  onSelectPalette: (id: PaletteId) => void
  onSelectFont: (id: FontId) => void
}

export function SidebarSettings({
  palette,
  font,
  onSelectPalette,
  onSelectFont,
}: SidebarSettingsProps) {
  return (
    <div className="sidebar-settings">
      <div className="sidebar-section-label">Settings</div>

      {/* Palette grid — 4-color swatches for each palette */}
      <div className="settings-palette-grid">
        {PALETTE_IDS.map((id) => {
          const tokens = PALETTES[id]
          const isActive = id === palette
          return (
            <button
              key={id}
              className={`settings-palette-btn${isActive ? ' settings-palette-btn--active' : ''}`}
              type="button"
              onClick={() => onSelectPalette(id)}
              title={`${PALETTE_LABELS[id]}${isActive ? ' (active)' : ''} — T to cycle`}
            >
              <span className="settings-swatch-row">
                {tokens.swatch.map((color, i) => (
                  <span key={i} className="settings-swatch-dot" style={{ background: color }} />
                ))}
              </span>
              <span className="settings-palette-label">{PALETTE_LABELS[id]}</span>
            </button>
          )
        })}
      </div>

      {/* Font selector */}
      <div className="settings-font-section">
        <label className="settings-font-label" htmlFor="font-select">
          Font
        </label>
        <select
          id="font-select"
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
      </div>
    </div>
  )
}
