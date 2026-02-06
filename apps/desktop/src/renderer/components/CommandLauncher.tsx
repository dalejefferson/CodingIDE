import { useState, useEffect, useCallback, useRef } from 'react'
import type { CommandPreset } from '@shared/types'
import { on } from '../utils/eventBus'
import '../styles/CommandLauncher.css'

interface CommandLauncherProps {
  projectId: string | null
  onRunCommand: (command: string) => void
}

export function CommandLauncher({ projectId, onRunCommand }: CommandLauncherProps) {
  const [open, setOpen] = useState(false)
  const [presets, setPresets] = useState<CommandPreset[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [commandInput, setCommandInput] = useState('')
  const [presetName, setPresetName] = useState('')
  const [presetCommand, setPresetCommand] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  // Load global presets on mount
  useEffect(() => {
    window.electronAPI.presets.getAll().then((loaded: CommandPreset[]) => {
      setPresets(loaded)
      setSelectedId(loaded[0]?.id ?? null)
    })
  }, [])

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [open])

  const persistPresets = useCallback((next: CommandPreset[]) => {
    setPresets(next)
    window.electronAPI.presets.setAll(next)
  }, [])

  const handlePlayClick = useCallback(() => {
    if (!projectId) return

    // Always run the selected preset if one exists, regardless of panel state
    const selected = presets.find((p) => p.id === selectedId)
    if (selected) {
      onRunCommand(selected.command)
      setOpen(false)
      return
    }

    // No preset selected — toggle the panel
    setOpen((prev) => !prev)
  }, [presets, selectedId, projectId, onRunCommand])

  // Cmd+P global shortcut triggers play
  useEffect(() => {
    return on('command-launcher:play', () => handlePlayClick())
  }, [handlePlayClick])

  const handleRunDirect = useCallback(() => {
    if (!commandInput.trim()) return
    onRunCommand(commandInput.trim())
    setCommandInput('')
    setOpen(false)
  }, [commandInput, onRunCommand])

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim() || !presetCommand.trim()) return
    const id = crypto.randomUUID()
    const next = [...presets, { id, name: presetName.trim(), command: presetCommand.trim() }]
    persistPresets(next)
    setSelectedId(id)
    setPresetName('')
    setPresetCommand('')
  }, [presetName, presetCommand, presets, persistPresets])

  const handleDeletePreset = useCallback(
    (id: string) => {
      const next = presets.filter((p) => p.id !== id)
      persistPresets(next)
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null)
      }
    },
    [presets, selectedId, persistPresets],
  )

  const handleRunPreset = useCallback(
    (preset: CommandPreset) => {
      setSelectedId(preset.id)
      onRunCommand(preset.command)
      setOpen(false)
    },
    [onRunCommand],
  )

  const handleTogglePanel = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  if (!projectId) return null

  const selectedPreset = presets.find((p) => p.id === selectedId)

  return (
    <div className="command-launcher" ref={panelRef}>
      {/* Play button */}
      <button
        type="button"
        className={`toolbar-btn command-launcher-play${selectedPreset ? ' command-launcher-play--has-preset' : ''}`}
        onClick={handlePlayClick}
        title={selectedPreset ? `Run: ${selectedPreset.name}` : 'Open command launcher'}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 2.5L12.5 8L4.5 13.5V2.5Z" />
        </svg>
      </button>

      {/* Dropdown toggle chevron */}
      <button
        type="button"
        className="command-launcher-toggle"
        onClick={handleTogglePanel}
        aria-label={open ? 'Close command panel' : 'Open command panel'}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {open ? <path d="M2 6.5L5 3.5L8 6.5" /> : <path d="M2 3.5L5 6.5L8 3.5" />}
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="command-launcher-panel">
          {/* Quick run */}
          <div className="command-launcher-section">
            <label className="command-launcher-label">Run command</label>
            <div className="command-launcher-row">
              <input
                type="text"
                className="command-launcher-input"
                placeholder="e.g. npm run dev"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunDirect()
                }}
                autoFocus
              />
              <button
                type="button"
                className="command-launcher-btn command-launcher-btn--run"
                onClick={handleRunDirect}
                disabled={!commandInput.trim()}
              >
                Run
              </button>
            </div>
          </div>

          {/* Save preset */}
          <div className="command-launcher-section">
            <label className="command-launcher-label">Save preset</label>
            <div className="command-launcher-row">
              <input
                type="text"
                className="command-launcher-input command-launcher-input--name"
                placeholder="Name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <input
                type="text"
                className="command-launcher-input"
                placeholder="Command"
                value={presetCommand}
                onChange={(e) => setPresetCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePreset()
                }}
              />
              <button
                type="button"
                className="command-launcher-btn"
                onClick={handleSavePreset}
                disabled={!presetName.trim() || !presetCommand.trim()}
              >
                Save
              </button>
            </div>
          </div>

          {/* Preset list */}
          {presets.length > 0 && (
            <div className="command-launcher-section">
              <label className="command-launcher-label">Presets</label>
              <ul className="command-launcher-presets">
                {presets.map((preset) => (
                  <li
                    key={preset.id}
                    className={`command-launcher-preset${preset.id === selectedId ? ' command-launcher-preset--selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="command-launcher-preset-select"
                      onClick={() => setSelectedId(preset.id)}
                      title="Set as default"
                    >
                      <span className="command-launcher-preset-name">{preset.name}</span>
                      <span className="command-launcher-preset-cmd">{preset.command}</span>
                    </button>
                    <button
                      type="button"
                      className="command-launcher-preset-run"
                      onClick={() => handleRunPreset(preset)}
                      title="Run now"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4.5 2.5L12.5 8L4.5 13.5V2.5Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="command-launcher-preset-delete"
                      onClick={() => handleDeletePreset(preset.id)}
                      title="Delete preset"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
