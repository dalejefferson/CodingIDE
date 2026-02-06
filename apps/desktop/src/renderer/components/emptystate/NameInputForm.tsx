import React, { useState, useRef, useEffect, useCallback } from 'react'

interface NameInputFormProps {
  visible: boolean
  onSubmit: (name: string) => void
  onCancel: () => void
}

export const NameInputForm = React.memo(function NameInputForm({
  visible,
  onSubmit,
  onCancel,
}: NameInputFormProps) {
  const [projectName, setProjectName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setProjectName('')
      inputRef.current?.focus()
    }
  }, [visible])

  const handleNameSubmit = useCallback(() => {
    const trimmed = projectName.trim()
    if (!trimmed) return
    setProjectName('')
    onSubmit(trimmed)
  }, [projectName, onSubmit])

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleNameSubmit()
      } else if (e.key === 'Escape') {
        setProjectName('')
        onCancel()
      }
    },
    [handleNameSubmit, onCancel],
  )

  const handleCancelClick = useCallback(() => {
    setProjectName('')
    onCancel()
  }, [onCancel])

  if (!visible) return null

  return (
    <div className="empty-state__name-input-row">
      <input
        ref={inputRef}
        className="empty-state__name-input"
        type="text"
        placeholder="Project name..."
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        onKeyDown={handleNameKeyDown}
      />
      <button
        className="empty-state__name-submit"
        type="button"
        onClick={handleNameSubmit}
        disabled={!projectName.trim()}
      >
        Create
      </button>
      <button className="empty-state__name-cancel" type="button" onClick={handleCancelClick}>
        Cancel
      </button>
    </div>
  )
})
