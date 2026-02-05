import { useState, useCallback, useRef } from 'react'
import type { FileEntry } from '@shared/types'

interface FileTreeState {
  entries: Map<string, FileEntry[]>
  expandedDirs: Set<string>
  loadingDirs: Set<string>
  errorDirs: Map<string, string>
}

export function useFileTree(projectId: string) {
  const [state, setState] = useState<FileTreeState>({
    entries: new Map(),
    expandedDirs: new Set(),
    loadingDirs: new Set(),
    errorDirs: new Map(),
  })

  const loadingRef = useRef(new Set<string>())

  const fetchDir = useCallback(
    async (dirPath: string) => {
      if (loadingRef.current.has(dirPath)) return
      loadingRef.current.add(dirPath)

      setState((prev) => {
        const newLoading = new Set(prev.loadingDirs)
        newLoading.add(dirPath)
        const newErrors = prev.errorDirs.has(dirPath) ? new Map(prev.errorDirs) : prev.errorDirs
        if (newErrors !== prev.errorDirs) newErrors.delete(dirPath)
        return { ...prev, loadingDirs: newLoading, errorDirs: newErrors }
      })

      try {
        const entries = await window.electronAPI.fileOps.listDir({ projectId, dirPath })
        setState((prev) => {
          const newEntries = new Map(prev.entries)
          newEntries.set(dirPath, entries)
          const newLoading = new Set(prev.loadingDirs)
          newLoading.delete(dirPath)
          const newExpanded = new Set(prev.expandedDirs)
          newExpanded.add(dirPath)
          return {
            ...prev,
            entries: newEntries,
            loadingDirs: newLoading,
            expandedDirs: newExpanded,
          }
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[useFileTree] fetchDir("${dirPath}") failed:`, msg)
        setState((prev) => {
          const newLoading = new Set(prev.loadingDirs)
          newLoading.delete(dirPath)
          const newErrors = new Map(prev.errorDirs)
          newErrors.set(dirPath, msg)
          return { ...prev, loadingDirs: newLoading, errorDirs: newErrors }
        })
      } finally {
        loadingRef.current.delete(dirPath)
      }
    },
    [projectId],
  )

  const toggleDir = useCallback(
    (dirPath: string) => {
      let needsFetch = false

      setState((prev) => {
        // Already expanded → collapse
        if (prev.expandedDirs.has(dirPath)) {
          const newExpanded = new Set(prev.expandedDirs)
          newExpanded.delete(dirPath)
          return { ...prev, expandedDirs: newExpanded }
        }

        // Already loaded but collapsed → expand
        if (prev.entries.has(dirPath)) {
          const newExpanded = new Set(prev.expandedDirs)
          newExpanded.add(dirPath)
          return { ...prev, expandedDirs: newExpanded }
        }

        // Not yet loaded → fetchDir will handle expanding
        needsFetch = true
        return prev
      })

      if (needsFetch) {
        fetchDir(dirPath)
      }
    },
    [fetchDir],
  )

  const refreshDir = useCallback(
    (dirPath: string) => {
      fetchDir(dirPath)
    },
    [fetchDir],
  )

  const collapseAll = useCallback(() => {
    setState((prev) => ({ ...prev, expandedDirs: new Set<string>() }))
  }, [])

  return {
    entries: state.entries,
    expandedDirs: state.expandedDirs,
    loadingDirs: state.loadingDirs,
    errorDirs: state.errorDirs,
    fetchDir,
    toggleDir,
    refreshDir,
    collapseAll,
  }
}
