import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import EmptyState from './components/EmptyState'
import Composer from './components/Composer'
import ProjectWorkspace from './components/ProjectWorkspace'
import { useTheme } from './hooks/useTheme'
import type { Project } from '@shared/types'
import './styles/App.css'

export function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

  const { palette, setPalette, font, setFont, cyclePalette } = useTheme()

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

  /**
   * Global keyboard handler.
   *
   * T key — cycle through all 9 palettes in order.
   *
   * Ignored when the user is typing in an input, textarea, or
   * contentEditable element to avoid accidental theme changes.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        cyclePalette()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cyclePalette])

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
        palette={palette}
        font={font}
        onSelectProject={setActiveProjectId}
        onOpenFolder={handleOpenFolder}
        onRemoveProject={handleRemoveProject}
        onSelectPalette={setPalette}
        onSelectFont={setFont}
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
