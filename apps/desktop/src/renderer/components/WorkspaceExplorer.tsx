/**
 * WorkspaceExplorer — file tree + code viewer panel within the project workspace.
 */

import React, { useState, useCallback, useRef } from 'react'
import { FileTree } from './FileTree'
import type { FileTreeHandle } from './FileTree'
import { CodeViewer } from './CodeViewer'

interface WorkspaceExplorerProps {
  projectId: string
  projectPath: string
  onClose: () => void
}

function WorkspaceExplorerInner({ projectId, projectPath, onClose }: WorkspaceExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const fileTreeRef = useRef<FileTreeHandle>(null)

  const handleSelectFile = useCallback((relPath: string) => setSelectedFile(relPath), [])
  const handleCloseFile = useCallback(() => setSelectedFile(null), [])

  return (
    <div className="workspace-explorer">
      <div className="workspace-explorer-tree">
        <div className="workspace-explorer-tree-header">
          <span className="workspace-explorer-tree-title">Explorer</span>
          <div className="workspace-explorer-actions">
            <button
              className="workspace-explorer-action"
              onClick={() => fileTreeRef.current?.refresh()}
              title="Refresh Explorer"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 8A5 5 0 113.5 5.5" />
                <path d="M3 2v4h4" />
              </svg>
            </button>
            <button
              className="workspace-explorer-action"
              onClick={() => fileTreeRef.current?.collapseAll()}
              title="Collapse Folders"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4l3 3-3 3" />
                <path d="M9 4l-3 3 3 3" />
                <path d="M13 3v10" />
              </svg>
            </button>
            <button
              className="workspace-explorer-action"
              onClick={onClose}
              title="Close Explorer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          </div>
        </div>
        <FileTree
          ref={fileTreeRef}
          projectId={projectId}
          projectPath={projectPath}
          selectedFile={selectedFile}
          onSelectFile={handleSelectFile}
        />
      </div>
      {selectedFile && (
        <div className="workspace-explorer-editor">
          <CodeViewer projectId={projectId} filePath={selectedFile} onClose={handleCloseFile} />
        </div>
      )}
    </div>
  )
}

export const WorkspaceExplorer = React.memo(WorkspaceExplorerInner)
