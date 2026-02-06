/**
 * useProjectActions — CRUD operations for projects.
 *
 * Encapsulates loading, adding (via folder dialog), creating (via name),
 * removing, and opening-from-ticket / opening-from-expo-app.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Project, ClaudeActivityMap, ClaudeStatusMap } from '@shared/types'

interface UseProjectActionsOptions {
  focusProject: (projectId: string) => void
  setActiveProjectId: (id: string | null) => void
  activeProjectId: string | null
}

export function useProjectActions({
  focusProject,
  setActiveProjectId,
  activeProjectId,
}: UseProjectActionsOptions) {
  const [projects, setProjects] = useState<Project[]>([])
  const [claudeActivity, setClaudeActivity] = useState<ClaudeActivityMap>({})
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatusMap>({})

  const loadProjects = useCallback(async () => {
    try {
      const all = await window.electronAPI.projects.getAll()
      setProjects(all)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }, [])

  const handleOpenFolder = useCallback(async () => {
    try {
      const folderPath = await window.electronAPI.projects.openFolderDialog()
      if (!folderPath) return
      const project = await window.electronAPI.projects.add({ path: folderPath })
      await loadProjects()
      setActiveProjectId(project.id)
    } catch (err) {
      console.error('Failed to open folder:', err)
    }
  }, [loadProjects, setActiveProjectId])

  const handleCreateProject = useCallback(
    async (name: string) => {
      try {
        const folderPath = await window.electronAPI.projects.createFolder({ name })
        if (!folderPath) return
        const project = await window.electronAPI.projects.add({ path: folderPath })
        await loadProjects()
        setActiveProjectId(project.id)
      } catch (err) {
        console.error('Failed to create project:', err)
      }
    },
    [loadProjects, setActiveProjectId],
  )

  const handleRemoveProject = useCallback(
    async (id: string) => {
      try {
        await window.electronAPI.projects.remove(id)
        if (activeProjectId === id) setActiveProjectId(null)
        await loadProjects()
      } catch (err) {
        console.error('Failed to remove project:', err)
      }
    },
    [activeProjectId, loadProjects, setActiveProjectId],
  )

  const handleOpenTicketAsProject = useCallback(
    async (ticketId: string) => {
      try {
        const project = await window.electronAPI.tickets.openAsProject({ ticketId })
        await loadProjects()
        focusProject(project.id)
      } catch (err) {
        console.error('Failed to open ticket as project:', err)
      }
    },
    [loadProjects, focusProject],
  )

  const handleEditAndPreview = useCallback(
    async (appId: string) => {
      try {
        const project = await window.electronAPI.expo.openAsProject({ appId })
        await loadProjects()
        focusProject(project.id)
      } catch (err) {
        console.error('Failed to open mobile app as project:', err)
      }
    },
    [loadProjects, focusProject],
  )

  // Load projects on mount
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // IPC subscriptions
  useEffect(() => window.electronAPI.claude.onActivity(setClaudeActivity), [])
  useEffect(() => window.electronAPI.claude.onStatus(setClaudeStatus), [])
  useEffect(
    () =>
      window.electronAPI.projects.onStatusChanged((change) => {
        setProjects((prev) =>
          prev.map((p) => (p.id === change.id ? { ...p, status: change.status } : p)),
        )
      }),
    [],
  )

  // Sidebar collapse on browser open + resize after transition
  const sidebarMountedRef = useRef(false)

  return {
    projects,
    setProjects,
    claudeActivity,
    claudeStatus,
    loadProjects,
    handleOpenFolder,
    handleCreateProject,
    handleRemoveProject,
    handleOpenTicketAsProject,
    handleEditAndPreview,
    sidebarMountedRef,
  }
}
