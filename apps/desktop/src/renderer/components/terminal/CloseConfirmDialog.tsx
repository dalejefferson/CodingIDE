import React, { useEffect, useRef } from 'react'

interface CloseConfirmDialogProps {
  onConfirm: () => void
  onCancel: () => void
}

export const CloseConfirmDialog = React.memo(function CloseConfirmDialog({
  onConfirm,
  onCancel,
}: CloseConfirmDialogProps) {
  const closeConfirmRef = useRef<HTMLButtonElement>(null)

  // Auto-focus the confirm button when the dialog appears
  useEffect(() => {
    closeConfirmRef.current?.focus()
  }, [])

  return (
    <div className="terminal-close-confirm">
      <div className="terminal-close-confirm-box">
        <span className="terminal-close-confirm-msg">Close this terminal?</span>
        <div className="terminal-close-confirm-actions">
          <button
            ref={closeConfirmRef}
            type="button"
            className="terminal-close-confirm-btn terminal-close-confirm-btn--close"
            onClick={onConfirm}
          >
            Close
          </button>
          <button
            type="button"
            className="terminal-close-confirm-btn terminal-close-confirm-btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
})
