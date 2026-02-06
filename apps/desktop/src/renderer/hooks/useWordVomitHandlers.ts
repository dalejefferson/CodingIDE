import { useCallback } from 'react'

interface UseWordVomitHandlersOptions {
  handleOpenKanban: () => void
  loadProjects: () => Promise<void>
  setWordVomitPrdForApp: (prd: string | null) => void
  setAppBuilderOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setKanbanOpen: (open: boolean) => void
  setActiveProjectId: (id: string | null) => void
  setIdeaLogOpen: (open: boolean) => void
}

export function useWordVomitHandlers({
  handleOpenKanban,
  loadProjects,
  setWordVomitPrdForApp,
  setAppBuilderOpen,
  setSettingsOpen,
  setKanbanOpen,
  setActiveProjectId,
  setIdeaLogOpen,
}: UseWordVomitHandlersOptions) {
  const handleWordVomitToRalph = useCallback(
    async (rawIdea: string, prdContent: string) => {
      const title = rawIdea.split(/[.\n]/)[0]?.trim().slice(0, 60) || 'Word Vomit Idea'
      await window.electronAPI.tickets.create({
        title,
        description: rawIdea,
        acceptanceCriteria: [],
        type: 'feature',
        priority: 'medium',
        projectId: null,
        prd: { content: prdContent, generatedAt: Date.now(), approved: true },
      })
      handleOpenKanban()
    },
    [handleOpenKanban],
  )

  const handleWordVomitToApp = useCallback((prdContent: string) => {
    setWordVomitPrdForApp(prdContent)
    setAppBuilderOpen(true)
    setSettingsOpen(false)
    setKanbanOpen(false)
    setActiveProjectId(null)
    setIdeaLogOpen(false)
  }, [setWordVomitPrdForApp, setAppBuilderOpen, setSettingsOpen, setKanbanOpen, setActiveProjectId, setIdeaLogOpen])

  const handleWordVomitToProject = useCallback(
    async (name: string, rawIdea: string, prdContent: string) => {
      const folderPath = await window.electronAPI.projects.createFolder({ name })
      if (!folderPath) return

      const project = await window.electronAPI.projects.add({ path: folderPath })

      // Save PRD into the project folder
      await window.electronAPI.fileOps.createFile({
        projectId: project.id,
        relPath: '.prd/prd.md',
        contents: prdContent,
        mkdirp: true,
      })

      // Save the raw idea as context
      await window.electronAPI.fileOps.createFile({
        projectId: project.id,
        relPath: '.prd/raw-idea.md',
        contents: `# Original Idea\n\n${rawIdea}`,
        mkdirp: true,
      })

      await loadProjects()
      setActiveProjectId(project.id)
    },
    [loadProjects, setActiveProjectId],
  )

  return { handleWordVomitToRalph, handleWordVomitToApp, handleWordVomitToProject }
}
