import { useCallback } from 'react'
import type { Idea } from '@shared/types'

interface UseIdeaHandlersOptions {
  handleOpenKanban: () => void
  loadProjects: () => Promise<void>
  setWordVomitPrdForApp: (prd: string | null) => void
  setAppBuilderOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setKanbanOpen: (open: boolean) => void
  setActiveProjectId: (id: string | null) => void
  setIdeaLogOpen: (open: boolean) => void
}

export function useIdeaHandlers({
  handleOpenKanban,
  loadProjects,
  setWordVomitPrdForApp,
  setAppBuilderOpen,
  setSettingsOpen,
  setKanbanOpen,
  setActiveProjectId,
  setIdeaLogOpen,
}: UseIdeaHandlersOptions) {
  const handleIdeaBuildAsApp = useCallback((idea: Idea) => {
    setWordVomitPrdForApp(idea.description || `# ${idea.title}\n\nBuild an app for: ${idea.title}`)
    setAppBuilderOpen(true)
    setSettingsOpen(false)
    setKanbanOpen(false)
    setActiveProjectId(null)
    setIdeaLogOpen(false)
  }, [setWordVomitPrdForApp, setAppBuilderOpen, setSettingsOpen, setKanbanOpen, setActiveProjectId, setIdeaLogOpen])

  const handleIdeaSendToBacklog = useCallback(
    async (idea: Idea) => {
      await window.electronAPI.tickets.create({
        title: idea.title,
        description: idea.description || idea.title,
        acceptanceCriteria: [],
        type: 'feature',
        priority: idea.priority === 'high' ? 'high' : idea.priority === 'low' ? 'low' : 'medium',
        projectId: idea.projectId,
      })
      handleOpenKanban()
    },
    [handleOpenKanban],
  )

  const handleIdeaWorkInTerminal = useCallback(
    async (idea: Idea) => {
      try {
        const safeName =
          idea.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'new-idea'
        const folderPath = await window.electronAPI.projects.createFolder({ name: safeName })
        if (!folderPath) return
        const project = await window.electronAPI.projects.add({ path: folderPath })
        await loadProjects()
        setActiveProjectId(project.id)
        setIdeaLogOpen(false)
      } catch (err) {
        console.error('Failed to create project from idea:', err)
      }
    },
    [loadProjects, setActiveProjectId, setIdeaLogOpen],
  )

  return { handleIdeaBuildAsApp, handleIdeaSendToBacklog, handleIdeaWorkInTerminal }
}
