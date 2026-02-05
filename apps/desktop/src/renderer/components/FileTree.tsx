import React, { useEffect, useImperativeHandle, useMemo } from 'react'
import type { FileEntry } from '@shared/types'
import { useFileTree } from '../hooks/useFileTree'
import '../styles/FileTree.css'

export interface FileTreeHandle {
  refresh: () => void
  collapseAll: () => void
}

/* ── SVG Icons ──────────────────────────────────────────────── */

function ChevronRightIcon() {
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

function FolderIcon({ open }: { open?: boolean }) {
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

function FileIcon() {
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

function getFileIconClass(name: string): string {
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

/* ── FileTreeNode (recursive sub-component) ─────────────────── */

interface FileTreeNodeProps {
  entry: FileEntry
  depth: number
  parentPath: string
  projectId: string
  selectedFile: string | null
  expandedDirs: Set<string>
  loadingDirs: Set<string>
  errorDirs: Map<string, string>
  entries: Map<string, FileEntry[]>
  onToggleDir: (path: string) => void
  onSelectFile: (path: string) => void
}

const FileTreeNode = React.memo(function FileTreeNode({
  entry,
  depth,
  parentPath,
  projectId,
  selectedFile,
  expandedDirs,
  loadingDirs,
  errorDirs,
  entries,
  onToggleDir,
  onSelectFile,
}: FileTreeNodeProps) {
  const fullPath = parentPath ? parentPath + '/' + entry.name : entry.name
  const isExpanded = expandedDirs.has(fullPath)
  const isLoading = loadingDirs.has(fullPath)
  const hasError = errorDirs.has(fullPath)
  const errorMsg = errorDirs.get(fullPath)
  const isSelected = selectedFile === fullPath
  const children = entries.get(fullPath)

  const style = useMemo(() => ({ '--depth': depth }) as React.CSSProperties, [depth])

  if (entry.isDir) {
    const nodeClasses = ['file-tree-node', 'file-tree-node--dir'].join(' ')

    return (
      <>
        <div
          className={nodeClasses}
          style={style}
          onClick={() => onToggleDir(fullPath)}
          role="treeitem"
          aria-expanded={isExpanded}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onToggleDir(fullPath)
            }
          }}
        >
          <span className={`file-tree-chevron${isExpanded ? ' file-tree-chevron--expanded' : ''}`}>
            <ChevronRightIcon />
          </span>
          <span className="file-tree-icon file-tree-icon--folder">
            <FolderIcon open={isExpanded} />
          </span>
          <span className="file-tree-name">{entry.name}</span>
          {isLoading && <span className="file-tree-spinner" />}
        </div>

        {hasError && (
          <div className="file-tree-error" style={{ '--depth': depth + 1 } as React.CSSProperties}>
            {errorMsg ?? 'Failed to load'}
          </div>
        )}

        {isExpanded && children && (
          <>
            {children.length === 0 ? (
              <div
                className="file-tree-empty"
                style={{ '--depth': depth + 1 } as React.CSSProperties}
              >
                Empty folder
              </div>
            ) : (
              <SortedEntries
                entries={children}
                depth={depth + 1}
                parentPath={fullPath}
                projectId={projectId}
                selectedFile={selectedFile}
                expandedDirs={expandedDirs}
                loadingDirs={loadingDirs}
                errorDirs={errorDirs}
                entriesMap={entries}
                onToggleDir={onToggleDir}
                onSelectFile={onSelectFile}
              />
            )}
          </>
        )}
      </>
    )
  }

  // File node
  const fileClasses = ['file-tree-node', isSelected ? 'file-tree-node--selected' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={fileClasses}
      style={style}
      onClick={() => onSelectFile(fullPath)}
      role="treeitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelectFile(fullPath)
        }
      }}
    >
      <span className="file-tree-chevron file-tree-chevron--spacer">
        <ChevronRightIcon />
      </span>
      <span className={`file-tree-icon ${getFileIconClass(entry.name)}`}>
        <FileIcon />
      </span>
      <span className="file-tree-name">{entry.name}</span>
    </div>
  )
})

/* ── SortedEntries (dirs first, then files, alphabetical) ──── */

interface SortedEntriesProps {
  entries: FileEntry[]
  depth: number
  parentPath: string
  projectId: string
  selectedFile: string | null
  expandedDirs: Set<string>
  loadingDirs: Set<string>
  errorDirs: Map<string, string>
  entriesMap: Map<string, FileEntry[]>
  onToggleDir: (path: string) => void
  onSelectFile: (path: string) => void
}

const SortedEntries = React.memo(function SortedEntries({
  entries,
  depth,
  parentPath,
  projectId,
  selectedFile,
  expandedDirs,
  loadingDirs,
  errorDirs,
  entriesMap,
  onToggleDir,
  onSelectFile,
}: SortedEntriesProps) {
  const sorted = useMemo(() => {
    const dirs = entries.filter((e) => e.isDir).sort((a, b) => a.name.localeCompare(b.name))
    const files = entries.filter((e) => !e.isDir).sort((a, b) => a.name.localeCompare(b.name))
    return [...dirs, ...files]
  }, [entries])

  return (
    <>
      {sorted.map((entry) => (
        <FileTreeNode
          key={entry.name}
          entry={entry}
          depth={depth}
          parentPath={parentPath}
          projectId={projectId}
          selectedFile={selectedFile}
          expandedDirs={expandedDirs}
          loadingDirs={loadingDirs}
          errorDirs={errorDirs}
          entries={entriesMap}
          onToggleDir={onToggleDir}
          onSelectFile={onSelectFile}
        />
      ))}
    </>
  )
})

/* ── FileTree (main exported component) ─────────────────────── */

interface FileTreeProps {
  projectId: string
  projectPath: string
  selectedFile: string | null
  onSelectFile: (path: string) => void
}

const FileTree = React.forwardRef<FileTreeHandle, FileTreeProps>(function FileTree(
  { projectId, projectPath, selectedFile, onSelectFile },
  ref,
) {
  const { entries, expandedDirs, loadingDirs, errorDirs, fetchDir, toggleDir, collapseAll } =
    useFileTree(projectId)

  // Load root directory on mount
  useEffect(() => {
    fetchDir('')
  }, [fetchDir])

  useImperativeHandle(
    ref,
    () => ({
      refresh: () => fetchDir(''),
      collapseAll,
    }),
    [fetchDir, collapseAll],
  )

  const rootEntries = entries.get('')

  return (
    <div className="file-tree" role="tree" aria-label={`File explorer for ${projectPath}`}>
      {loadingDirs.has('') && !rootEntries && (
        <div className="file-tree-empty">
          <span className="file-tree-spinner" /> Loading...
        </div>
      )}

      {errorDirs.has('') && !rootEntries && (
        <div className="file-tree-error" style={{ '--depth': 0 } as React.CSSProperties}>
          {errorDirs.get('') ?? 'Failed to load project files'}
        </div>
      )}

      {rootEntries && rootEntries.length === 0 && (
        <div className="file-tree-empty">Empty project</div>
      )}

      {rootEntries && rootEntries.length > 0 && (
        <SortedEntries
          entries={rootEntries}
          depth={0}
          parentPath=""
          projectId={projectId}
          selectedFile={selectedFile}
          expandedDirs={expandedDirs}
          loadingDirs={loadingDirs}
          errorDirs={errorDirs}
          entriesMap={entries}
          onToggleDir={toggleDir}
          onSelectFile={onSelectFile}
        />
      )}
    </div>
  )
})

const MemoizedFileTree = React.memo(FileTree)
export { MemoizedFileTree as FileTree }
