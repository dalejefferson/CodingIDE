import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import EmptyState from './components/EmptyState'
import Composer from './components/Composer'
import ProjectWorkspace from './components/ProjectWorkspace'
import type { Project } from '@shared/types'
import './styles/App.css'

export function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

  const loadProjects = useCallback(async () => {
    try {
      const all = await window.electronAPI.projects.getAll()
      setProjects(all)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

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
  }, [loadProjects])

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
    [activeProjectId, loadProjects],
  )

  return (
    <div className="app">
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onOpenFolder={handleOpenFolder}
        onRemoveProject={handleRemoveProject}
      />
      <div className="main-pane">
        <Toolbar projectName={activeProject?.name ?? null} onOpenFolder={handleOpenFolder} />
        <div className="main-content">
          {activeProject ? (
            <ProjectWorkspace project={activeProject} />
          ) : (
            <EmptyState onOpenFolder={handleOpenFolder} />
          )}
        </div>
        <Composer />
      </div>
    </div>
  )
}
