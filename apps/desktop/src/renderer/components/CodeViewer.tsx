import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { FileReadResponse, FileOpsResult } from '@shared/types'
import '../styles/CodeViewer.css'

interface CodeViewerProps {
  projectId: string
  filePath: string | null
  onClose?: () => void
  onSave?: () => void
}

/* ── Inline SVG icons ───────────────────────────────────────────────────────── */

const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="3" x2="11" y2="11" />
    <line x1="11" y1="3" x2="3" y2="11" />
  </svg>
)

const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.08 2.33a1.75 1.75 0 0 1 2.47 2.47L5.13 12.22 1.75 13l.78-3.38z" />
  </svg>
)

const SaveIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11.67 13H2.33A1.17 1.17 0 0 1 1.17 11.83V2.33A1.17 1.17 0 0 1 2.33 1.17h7.58L12.83 4.08v7.75A1.17 1.17 0 0 1 11.67 13z" />
    <path d="M10.5 13V8.17H3.5V13" />
    <path d="M3.5 1.17V4.67h5.83" />
  </svg>
)

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function basename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export const CodeViewer = React.memo(function CodeViewer({
  projectId,
  filePath,
  onClose,
  onSave,
}: CodeViewerProps) {
  const [contents, setContents] = useState('')
  const [originalContents, setOriginalContents] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [fileSize, setFileSize] = useState(0)
  const [saving, setSaving] = useState(false)

  const gutterRef = useRef<HTMLPreElement>(null)
  const contentRef = useRef<HTMLPreElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isDirty = contents !== originalContents
  const lineCount = useMemo(() => contents.split('\n').length, [contents])

  /* ── Load file when filePath changes ──────────────────────────────────────── */

  useEffect(() => {
    if (!filePath) {
      setContents('')
      setOriginalContents('')
      setError(null)
      setEditing(false)
      setFileSize(0)
      return
    }

    setLoading(true)
    setError(null)
    setEditing(false)

    window.electronAPI.fileOps
      .readFile({ projectId, relPath: filePath })
      .then((result) => {
        if ('contents' in result) {
          const data = result as FileReadResponse
          setContents(data.contents)
          setOriginalContents(data.contents)
          setFileSize(data.size)
        } else {
          const errResult = result as FileOpsResult
          setError(errResult.error?.message ?? 'Failed to read file')
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [projectId, filePath])

  /* ── Save handler ─────────────────────────────────────────────────────────── */

  const handleSave = useCallback(async () => {
    if (!filePath || saving) return
    setSaving(true)
    try {
      const result = await window.electronAPI.fileOps.writeFile({
        projectId,
        relPath: filePath,
        contents,
        mode: 'overwrite',
      })
      if (result.ok) {
        setOriginalContents(contents)
        onSave?.()
      } else {
        setError(result.error?.message ?? 'Failed to save file')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }, [filePath, projectId, contents, saving, onSave])

  /* ── Cmd+S keyboard shortcut (works in both view and edit mode) ──────────── */

  useEffect(() => {
    if (!filePath) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filePath, handleSave])

  /* ── Scroll sync between gutter and content ───────────────────────────────── */

  const handleContentScroll = useCallback(() => {
    const source = editing ? textareaRef.current : contentRef.current
    if (source && gutterRef.current) {
      gutterRef.current.scrollTop = source.scrollTop
    }
  }, [editing])

  /* ── Toggle edit mode ─────────────────────────────────────────────────────── */

  const handleToggleEdit = useCallback(() => {
    setEditing((prev) => !prev)
  }, [])

  /* ── Line numbers ─────────────────────────────────────────────────────────── */

  const gutterText = useMemo(() => {
    const lines: string[] = []
    for (let i = 1; i <= lineCount; i++) lines.push(String(i))
    return lines.join('\n')
  }, [lineCount])

  /* ── Empty state ──────────────────────────────────────────────────────────── */

  if (!filePath) {
    return (
      <div className="code-viewer">
        <div className="code-viewer-empty">
          <span className="code-viewer-empty-text">Select a file to view its contents</span>
        </div>
      </div>
    )
  }

  /* ── Loading state ────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="code-viewer">
        <div className="code-viewer-header">
          <span className="code-viewer-filename">{basename(filePath)}</span>
          {onClose && (
            <button
              type="button"
              className="code-viewer-btn code-viewer-btn--icon"
              onClick={onClose}
              title="Close"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <div className="code-viewer-loading">
          <div className="code-viewer-spinner" />
        </div>
      </div>
    )
  }

  /* ── Error state ──────────────────────────────────────────────────────────── */

  if (error) {
    return (
      <div className="code-viewer">
        <div className="code-viewer-header">
          <span className="code-viewer-filename">{basename(filePath)}</span>
          {onClose && (
            <button
              type="button"
              className="code-viewer-btn code-viewer-btn--icon"
              onClick={onClose}
              title="Close"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <div className="code-viewer-error">
          <span className="code-viewer-error-text">{error}</span>
        </div>
      </div>
    )
  }

  /* ── Main render ──────────────────────────────────────────────────────────── */

  return (
    <div className="code-viewer">
      {/* Header */}
      <div className="code-viewer-header">
        <span className="code-viewer-filename">{basename(filePath)}</span>
        {isDirty && <span className="code-viewer-dirty-dot" title="Unsaved changes" />}
        <span className="code-viewer-size">{formatSize(fileSize)}</span>

        {editing ? (
          <button
            type="button"
            className="code-viewer-btn code-viewer-btn--primary"
            onClick={handleSave}
            disabled={saving || !isDirty}
            title="Save (Cmd+S)"
          >
            <SaveIcon />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        ) : (
          <button
            type="button"
            className="code-viewer-btn code-viewer-btn--secondary"
            onClick={handleToggleEdit}
            title="Edit file"
          >
            <EditIcon />
            <span>Edit</span>
          </button>
        )}

        {editing && (
          <button
            type="button"
            className="code-viewer-btn code-viewer-btn--secondary"
            onClick={handleToggleEdit}
            title="Exit edit mode"
          >
            Cancel
          </button>
        )}

        {onClose && (
          <button
            type="button"
            className="code-viewer-btn code-viewer-btn--icon"
            onClick={onClose}
            title="Close"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="code-viewer-body">
        {/* Gutter (line numbers) */}
        <pre className="code-viewer-gutter" ref={gutterRef}>
          {gutterText}
        </pre>

        {/* Content area */}
        {editing ? (
          <textarea
            ref={textareaRef}
            className="code-viewer-textarea"
            value={contents}
            onChange={(e) => setContents(e.target.value)}
            onScroll={handleContentScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        ) : (
          <pre
            ref={contentRef}
            className="code-viewer-content"
            onScroll={handleContentScroll}
            onDoubleClick={() => setEditing(true)}
          >
            {contents}
          </pre>
        )}
      </div>
    </div>
  )
})

export default CodeViewer
