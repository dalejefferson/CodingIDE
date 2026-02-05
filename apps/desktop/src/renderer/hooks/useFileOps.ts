import { useState, useCallback } from 'react'
import type { FileOpsResult, FileReadResponse } from '@shared/types'

interface FileOpsState {
  loading: boolean
  error: string | null
  success: string | null
}

export function useFileOps(projectId: string | null) {
  const [state, setState] = useState<FileOpsState>({
    loading: false,
    error: null,
    success: null,
  })

  const clearMessages = useCallback(() => {
    setState((s) => ({ ...s, error: null, success: null }))
  }, [])

  const createFile = useCallback(
    async (relPath: string, contents: string = '', mkdirp: boolean = false) => {
      if (!projectId) return null
      setState({ loading: true, error: null, success: null })
      try {
        const result = await window.electronAPI.fileOps.createFile({
          projectId,
          relPath,
          contents,
          mkdirp,
        })
        if (result.ok) {
          setState({ loading: false, error: null, success: `Created ${relPath}` })
        } else {
          setState({
            loading: false,
            error: result.error?.message ?? 'Failed to create file',
            success: null,
          })
        }
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setState({ loading: false, error: msg, success: null })
        return null
      }
    },
    [projectId],
  )

  const readFile = useCallback(
    async (relPath: string): Promise<FileReadResponse | null> => {
      if (!projectId) return null
      setState({ loading: true, error: null, success: null })
      try {
        const result = await window.electronAPI.fileOps.readFile({ projectId, relPath })
        if ('contents' in result) {
          setState({ loading: false, error: null, success: null })
          return result as FileReadResponse
        }
        const errResult = result as FileOpsResult
        setState({
          loading: false,
          error: errResult.error?.message ?? 'Failed to read file',
          success: null,
        })
        return null
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setState({ loading: false, error: msg, success: null })
        return null
      }
    },
    [projectId],
  )

  const writeFile = useCallback(
    async (relPath: string, contents: string, mode: 'overwrite' | 'createOnly' = 'overwrite') => {
      if (!projectId) return null
      setState({ loading: true, error: null, success: null })
      try {
        const result = await window.electronAPI.fileOps.writeFile({
          projectId,
          relPath,
          contents,
          mode,
        })
        if (result.ok) {
          setState({ loading: false, error: null, success: `Saved ${relPath}` })
        } else {
          setState({
            loading: false,
            error: result.error?.message ?? 'Failed to write file',
            success: null,
          })
        }
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setState({ loading: false, error: msg, success: null })
        return null
      }
    },
    [projectId],
  )

  return { ...state, createFile, readFile, writeFile, clearMessages }
}
