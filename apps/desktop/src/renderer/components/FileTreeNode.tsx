import React, { useMemo } from 'react'
import type { FileEntry } from '@shared/types'

/* ── FlatNode types (used by virtualizer) ─────────────────── */

export type FlatNodeKind = 'dir' | 'file' | 'loading' | 'error' | 'empty'

export interface FlatNode {
  kind: FlatNodeKind
  entry: FileEntry
  depth: number
  fullPath: string
  parentPath: string
  errorMsg?: string
}

/* ── SVG Icons ──────────────────────────────────────────────── */

export function ChevronRightIcon() {
  return (
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
      <path d="M6 3L11 8L6 13" />
    </svg>
  )
}

export function FolderIcon({ open }: { open?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {open ? (
        <>
          <path d="M1.5 3.5h4l1 -1.5h4.5a1 1 0 0 1 1 1v2.5" />
          <path d="M1.5 5.5l1.5 6h8.5l1.5 -6h-11.5z" />
        </>
      ) : (
        <path d="M1.5 3.5h4l1 -1.5h4.5a1 1 0 0 1 1 1v7a1 1 0 0 1 -1 1h-8.5a1 1 0 0 1 -1 -1v-6.5z" />
      )}
    </svg>
  )
}

export function FileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 1.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-7l-3-3z" />
      <path d="M8.5 1.5v3h3" />
    </svg>
  )
}

/* ── File extension → icon CSS class mapping ────────────────── */

export function getFileIconClass(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : ''
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'file-tree-icon--ts'
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'file-tree-icon--js'
    case 'json':
      return 'file-tree-icon--json'
    case 'css':
    case 'scss':
    case 'less':
      return 'file-tree-icon--css'
    case 'md':
    case 'mdx':
      return 'file-tree-icon--md'
    default:
      return 'file-tree-icon--file'
  }
}

/* ── VirtualFileRow (flat, non-recursive row) ────────────────── */

export interface VirtualFileRowProps {
  node: FlatNode
  selectedFile: string | null
  expandedDirs: Set<string>
  loadingDirs: Set<string>
  onToggleDir: (path: string) => void
  onSelectFile: (path: string) => void
}

export const VirtualFileRow = React.memo(function VirtualFileRow({
  node,
  selectedFile,
  expandedDirs,
  loadingDirs,
  onToggleDir,
  onSelectFile,
}: VirtualFileRowProps) {
  const style = useMemo(() => ({ '--depth': node.depth }) as React.CSSProperties, [node.depth])

  // Loading placeholder row
  if (node.kind === 'loading') {
    return (
      <div className="file-tree-empty" style={style}>
        <span className="file-tree-spinner" /> Loading...
      </div>
    )
  }

  // Error placeholder row
  if (node.kind === 'error') {
    return (
      <div className="file-tree-error" style={style}>
        {node.errorMsg ?? 'Failed to load'}
      </div>
    )
  }

  // Empty folder placeholder row
  if (node.kind === 'empty') {
    return (
      <div className="file-tree-empty" style={style}>
        Empty folder
      </div>
    )
  }

  // Directory row
  if (node.kind === 'dir') {
    const isExpanded = expandedDirs.has(node.fullPath)
    const isLoading = loadingDirs.has(node.fullPath)

    return (
      <div
        className="file-tree-node file-tree-node--dir"
        style={style}
        onClick={() => onToggleDir(node.fullPath)}
        role="treeitem"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggleDir(node.fullPath)
          }
        }}
      >
        <span className={`file-tree-chevron${isExpanded ? ' file-tree-chevron--expanded' : ''}`}>
          <ChevronRightIcon />
        </span>
        <span className="file-tree-icon file-tree-icon--folder">
          <FolderIcon open={isExpanded} />
        </span>
        <span className="file-tree-name">{node.entry.name}</span>
        {isLoading && <span className="file-tree-spinner" />}
      </div>
    )
  }

  // File row
  const isSelected = selectedFile === node.fullPath
  const fileClasses = ['file-tree-node', isSelected ? 'file-tree-node--selected' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={fileClasses}
      style={style}
      onClick={() => onSelectFile(node.fullPath)}
      role="treeitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelectFile(node.fullPath)
        }
      }}
    >
      <span className="file-tree-chevron file-tree-chevron--spacer">
        <ChevronRightIcon />
      </span>
      <span className={`file-tree-icon ${getFileIconClass(node.entry.name)}`}>
        <FileIcon />
      </span>
      <span className="file-tree-name">{node.entry.name}</span>
    </div>
  )
})
