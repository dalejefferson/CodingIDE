import React, { useState, useCallback } from 'react'

interface APIKeyInputProps {
  label: string
  hint: string
  placeholder: string
  initialValue: string
  onSave: (key: string) => void
  style?: React.CSSProperties
}

export const APIKeyInput = React.memo(function APIKeyInput({
  label,
  hint,
  placeholder,
  initialValue,
  onSave,
  style,
}: APIKeyInputProps) {
  const [value, setValue] = useState(initialValue)
  const [saved, setSaved] = useState(false)

  const handleSave = useCallback(() => {
    onSave(value)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [value, onSave])

  // Sync with parent value if it changes externally
  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return (
    <>
      <label className="settings-section-hint" style={style}>
        {label}
      </label>
      <div className="settings-input-row">
        <input
          type="password"
          className="settings-api-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
        />
        <button type="button" className="settings-save-btn" onClick={handleSave}>
          Save
        </button>
        {saved && <span className="settings-saved-indicator">Saved!</span>}
      </div>
      <p className="settings-section-hint" style={{ marginTop: 'var(--space-xs)' }}>
        {hint}
      </p>
    </>
  )
})
