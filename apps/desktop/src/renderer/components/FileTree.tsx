import React, { useEffect, useImperativeHandle } from 'react'
import { useFileTree } from '../hooks/useFileTree'
import { SortedEntries } from './FileTreeNode'
import '../styles/FileTree.css'

export interface FileTreeHandle {
  refresh: () => void
  collapseAll: () => void
}

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
