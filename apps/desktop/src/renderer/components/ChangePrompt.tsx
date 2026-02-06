import React, { useRef, useEffect } from 'react'

interface PickedChange {
  element: string
  instruction: string
}

interface ChangePromptProps {
  pendingPick: string | null
  changeInput: string
  pickedChanges: PickedChange[]
  onChangeInput: (value: string) => void
  onSubmitChange: () => void
  onRemoveChange: (index: number) => void
  onSkipPick: () => void
  onSendToClaude: () => void
  onClearChanges: () => void
}

export const ChangePrompt = React.memo(function ChangePrompt({
  pendingPick,
  changeInput,
  pickedChanges,
  onChangeInput,
  onSubmitChange,
  onRemoveChange,
  onSkipPick,
  onSendToClaude,
  onClearChanges,
}: ChangePromptProps) {
  const changeInputRef = useRef<HTMLInputElement>(null)

  // Focus the input when a new element is picked
  useEffect(() => {
    if (pendingPick) changeInputRef.current?.focus()
  }, [pendingPick])

  return (
    <>
      {/* Change input prompt — shown when an element was just picked */}
      {pendingPick && (
        <div className="workspace-change-prompt">
          <pre className="workspace-change-element">{pendingPick.split('\n')[0]}</pre>
          <input
            ref={changeInputRef}
            className="workspace-change-input"
            value={changeInput}
            onChange={(e) => onChangeInput(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter' && changeInput.trim()) onSubmitChange()
              if (e.key === 'Escape') onSkipPick()
            }}
            placeholder="What change do you want to make?"
          />
          <div className="workspace-change-actions">
            <button
              type="button"
              className="workspace-change-btn workspace-change-btn--primary"
              onClick={onSubmitChange}
              disabled={!changeInput.trim()}
            >
              Add
            </button>
            <button
              type="button"
              className="workspace-change-btn"
              onClick={onSkipPick}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Queued changes list */}
      {pickedChanges.length > 0 && !pendingPick && (
        <div className="workspace-change-list">
          <div className="workspace-change-list-header">
            {pickedChanges.length} change{pickedChanges.length > 1 ? 's' : ''} queued
          </div>
          {pickedChanges.map((change, i) => (
            <div key={i} className="workspace-change-item">
              <span className="workspace-change-number">{i + 1}</span>
              <span className="workspace-change-instruction">{change.instruction}</span>
              <button
                type="button"
                className="workspace-change-remove"
                onClick={() => onRemoveChange(i)}
              >
                &times;
              </button>
            </div>
          ))}
          <div className="workspace-change-list-actions">
            <button
              type="button"
              className="workspace-change-btn workspace-change-btn--send"
              onClick={onSendToClaude}
            >
              Send to Claude
            </button>
            <button type="button" className="workspace-change-btn" onClick={onClearChanges}>
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  )
})
