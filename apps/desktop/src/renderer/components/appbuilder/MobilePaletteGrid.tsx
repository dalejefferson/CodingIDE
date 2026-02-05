import { MOBILE_PALETTES } from '@shared/mobilePalettes'
import type { MobileAppPalette } from '@shared/types'

interface MobilePaletteGridProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

const SWATCH_KEYS: (keyof MobileAppPalette['colors'])[] = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
  'text',
]

export function MobilePaletteGrid({ selectedId, onSelect }: MobilePaletteGridProps) {
  const handleClick = (id: string) => {
    onSelect(selectedId === id ? null : id)
  }

  return (
    <div className="palette-grid">
      {MOBILE_PALETTES.map((palette) => {
        const isSelected = selectedId === palette.id
        return (
          <button
            key={palette.id}
            type="button"
            className={`palette-card${isSelected ? ' palette-card--selected' : ''}`}
            onClick={() => handleClick(palette.id)}
            title={palette.name}
          >
            <span className="palette-card__name">{palette.name}</span>
            <div className="palette-card__swatches">
              {SWATCH_KEYS.map((key) => (
                <span
                  key={key}
                  className="palette-swatch"
                  style={{ backgroundColor: palette.colors[key] }}
                  title={`${key}: ${palette.colors[key]}`}
                />
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}
