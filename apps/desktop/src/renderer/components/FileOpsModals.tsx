import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useFileOps } from '../hooks/useFileOps'
import '../styles/FileOpsModals.css'

// -- Create File Modal -------------------------------------------------------

interface CreateFileModalProps {
  projectId: string
  onClose: () => void
  onCreated?: (relPath: string) => void
}

export function CreateFileModal({ projectId, onClose, onCreated }: CreateFileModalProps) {
  const [relPath, setRelPath] = useState('')
  const [contents, setContents] = useState('')
  const [mkdirp, setMkdirp] = useState(true)
  const { loading, error, success, createFile, clearMessages } = useFileOps(projectId)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-close after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onCreated?.(relPath)
        onClose()
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [success, onClose, onCreated, relPath])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!relPath.trim()) return
      clearMessages()
      await createFile(relPath.trim(), contents, mkdirp)
    },
    [relPath, contents, mkdirp, createFile, clearMessages],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    },
    [onClose],
  )

  return (
    <div className="fileops-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="fileops-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fileops-modal-header">
          <span className="fileops-modal-title">Create File</span>
          <button type="button" className="fileops-close-btn" onClick={onClose}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M4 4L12 12M12 4L4 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="fileops-modal-body">
          <label className="fileops-label">
            Relative path
            <input
              ref={inputRef}
              className="fileops-input"
              type="text"
              value={relPath}
              onChange={(e) => setRelPath(e.target.value)}
              placeholder="src/utils/helper.ts"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <label className="fileops-label">
            Initial contents
            <textarea
              className="fileops-textarea"
              value={contents}
              onChange={(e) => setContents(e.target.value)}
              placeholder="(optional)"
              rows={6}
              spellCheck={false}
            />
          </label>
          <label className="fileops-checkbox-label">
            <input type="checkbox" checked={mkdirp} onChange={(e) => setMkdirp(e.target.checked)} />
            Create missing folders
          </label>
          {error && <div className="fileops-message fileops-message--error">{error}</div>}
          {success && <div className="fileops-message fileops-message--success">{success}</div>}
          <div className="fileops-actions">
            <button type="button" className="fileops-btn fileops-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="fileops-btn fileops-btn--primary"
              disabled={loading || !relPath.trim()}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// -- Edit File Modal ---------------------------------------------------------

interface EditFileModalProps {
  projectId: string
  initialPath?: string
  onClose: () => void
  onSaved?: (relPath: string) => void
}

export function EditFileModal({ projectId, initialPath, onClose, onSaved }: EditFileModalProps) {
  const [relPath, setRelPath] = useState(initialPath ?? '')
  const [contents, setContents] = useState('')
  const [loaded, setLoaded] = useState(false)
  const { loading, error, success, readFile, writeFile, clearMessages } = useFileOps(projectId)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialPath) {
      handleLoad(initialPath)
    } else {
      inputRef.current?.focus()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close after success save
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onSaved?.(relPath)
        onClose()
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [success, onClose, onSaved, relPath])

  const handleLoad = useCallback(
    async (path?: string) => {
      const target = (path ?? relPath).trim()
      if (!target) return
      clearMessages()
      const result = await readFile(target)
      if (result) {
        setContents(result.contents)
        setLoaded(true)
        if (path) setRelPath(path)
      }
    },
    [relPath, readFile, clearMessages],
  )

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!relPath.trim() || !loaded) return
      clearMessages()
      await writeFile(relPath.trim(), contents, 'overwrite')
    },
    [relPath, contents, loaded, writeFile, clearMessages],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    },
    [onClose],
  )

  return (
    <div className="fileops-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="fileops-modal fileops-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="fileops-modal-header">
          <span className="fileops-modal-title">Edit File</span>
          <button type="button" className="fileops-close-btn" onClick={onClose}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M4 4L12 12M12 4L4 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="fileops-modal-body">
          <div className="fileops-path-row">
            <input
              ref={inputRef}
              className="fileops-input"
              type="text"
              value={relPath}
              onChange={(e) => {
                setRelPath(e.target.value)
                setLoaded(false)
              }}
              placeholder="src/utils/helper.ts"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className="fileops-btn fileops-btn--secondary"
              onClick={() => handleLoad()}
              disabled={loading || !relPath.trim()}
            >
              {loading && !loaded ? 'Loading...' : 'Load'}
            </button>
          </div>
          <textarea
            className="fileops-textarea fileops-textarea--editor"
            value={contents}
            onChange={(e) => setContents(e.target.value)}
            placeholder={loaded ? '' : 'Load a file first...'}
            rows={16}
            spellCheck={false}
            disabled={!loaded}
          />
          {error && <div className="fileops-message fileops-message--error">{error}</div>}
          {success && <div className="fileops-message fileops-message--success">{success}</div>}
          <div className="fileops-actions">
            <button type="button" className="fileops-btn fileops-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="fileops-btn fileops-btn--primary"
              disabled={loading || !loaded || !relPath.trim()}
            >
              {loading && loaded ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
