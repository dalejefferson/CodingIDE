import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useFileTree } from '../hooks/useFileTree'
import type { FlatNode } from './FileTreeNode'
import { VirtualFileRow } from './FileTreeNode'
import type { FileEntry } from '@shared/types'
import '../styles/FileTree.css'

export interface FileTreeHandle {
  refresh: () => void
  collapseAll: () => void
}

/* ── Flatten recursive tree into a flat list for virtualizer ── */

const PLACEHOLDER_ENTRY: FileEntry = { name: '', isDir: false, size: 0 }

function sortEntries(items: FileEntry[]): FileEntry[] {
  const dirs = items.filter((e) => e.isDir).sort((a, b) => a.name.localeCompare(b.name))
  const files = items.filter((e) => !e.isDir).sort((a, b) => a.name.localeCompare(b.name))
  return [...dirs, ...files]
}

function flattenTree(
  entries: Map<string, FileEntry[]>,
  expandedDirs: Set<string>,
  loadingDirs: Set<string>,
  errorDirs: Map<string, string>,
): FlatNode[] {
  const result: FlatNode[] = []

  function walk(parentPath: string, depth: number) {
    const children = entries.get(parentPath)
    if (!children) return

    const sorted = sortEntries(children)

    for (const entry of sorted) {
      const fullPath = parentPath ? parentPath + '/' + entry.name : entry.name

      if (entry.isDir) {
        result.push({ kind: 'dir', entry, depth, fullPath, parentPath })

        // Error placeholder for this directory
        if (errorDirs.has(fullPath)) {
          result.push({
            kind: 'error',
            entry: PLACEHOLDER_ENTRY,
            depth: depth + 1,
            fullPath: fullPath + '/__error__',
            parentPath: fullPath,
            errorMsg: errorDirs.get(fullPath),
          })
        }

        // Expanded directory children
        if (expandedDirs.has(fullPath)) {
          const dirChildren = entries.get(fullPath)
          if (dirChildren) {
            if (dirChildren.length === 0) {
              // Empty folder placeholder
              result.push({
                kind: 'empty',
                entry: PLACEHOLDER_ENTRY,
                depth: depth + 1,
                fullPath: fullPath + '/__empty__',
                parentPath: fullPath,
              })
            } else {
              walk(fullPath, depth + 1)
            }
          } else if (loadingDirs.has(fullPath)) {
            // Loading placeholder (no children yet, still loading)
            result.push({
              kind: 'loading',
              entry: PLACEHOLDER_ENTRY,
              depth: depth + 1,
              fullPath: fullPath + '/__loading__',
              parentPath: fullPath,
            })
          }
        }
      } else {
        result.push({ kind: 'file', entry, depth, fullPath, parentPath })
      }
    }
  }

  walk('', 0)
  return result
}

/* ── FileTree (main exported component) ─────────────────────── */

interface FileTreeProps {
  projectId: string
  projectPath: string
  selectedFile: string | null
  onSelectFile: (path: string) => void
}

const ROW_HEIGHT = 24
const OVERSCAN = 10

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

  const flatNodes = useMemo(
    () => flattenTree(entries, expandedDirs, loadingDirs, errorDirs),
    [entries, expandedDirs, loadingDirs, errorDirs],
  )

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  })

  // Root-level loading state (before any entries arrive)
  if (loadingDirs.has('') && !rootEntries) {
    return (
      <div className="file-tree" role="tree" aria-label={`File explorer for ${projectPath}`}>
        <div className="file-tree-empty">
          <span className="file-tree-spinner" /> Loading...
        </div>
      </div>
    )
  }

  // Root-level error state (before any entries arrive)
  if (errorDirs.has('') && !rootEntries) {
    return (
      <div className="file-tree" role="tree" aria-label={`File explorer for ${projectPath}`}>
        <div className="file-tree-error" style={{ '--depth': 0 } as React.CSSProperties}>
          {errorDirs.get('') ?? 'Failed to load project files'}
        </div>
      </div>
    )
  }

  // Empty project
  if (rootEntries && rootEntries.length === 0) {
    return (
      <div className="file-tree" role="tree" aria-label={`File explorer for ${projectPath}`}>
        <div className="file-tree-empty">Empty project</div>
      </div>
    )
  }

  return (
    <div
      className="file-tree"
      role="tree"
      aria-label={`File explorer for ${projectPath}`}
      ref={parentRef}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const node = flatNodes[virtualRow.index]
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <VirtualFileRow
                node={node}
                selectedFile={selectedFile}
                expandedDirs={expandedDirs}
                loadingDirs={loadingDirs}
                onToggleDir={toggleDir}
                onSelectFile={onSelectFile}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
})

const MemoizedFileTree = React.memo(FileTree)
export { MemoizedFileTree as FileTree }
