import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import EmptyState from './components/EmptyState'
import Composer from './components/Composer'
import ProjectWorkspace from './components/ProjectWorkspace'
import { SettingsPage } from './components/SettingsPage'
import { useTheme } from './hooks/useTheme'
import type { Project } from '@shared/types'
import './styles/App.css'

export function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

  const { palette, setPalette, font, setFont, cyclePalette } = useTheme()

  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), [])
  const toggleSettings = useCallback(() => setSettingsOpen((prev) => !prev), [])

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
   * Cmd/Ctrl+B — toggle sidebar
   * T key — cycle through all 9 palettes in order.
   *
   * T is ignored when the user is typing in an input, textarea, or
   * contentEditable element to avoid accidental theme changes.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }

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
  }, [cyclePalette, toggleSidebar])

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

  const mainContent = settingsOpen ? (
    <SettingsPage
      palette={palette}
      font={font}
      onSelectPalette={setPalette}
      onSelectFont={setFont}
    />
  ) : activeProject ? (
    <ProjectWorkspace project={activeProject} />
  ) : (
    <EmptyState onOpenFolder={handleOpenFolder} />
  )

  return (
    <div className="app">
      <div className={`sidebar-wrapper${sidebarCollapsed ? ' sidebar-wrapper--collapsed' : ''}`}>
        <Sidebar
          projects={projects}
          activeProjectId={activeProjectId}
          collapsed={sidebarCollapsed}
          settingsOpen={settingsOpen}
          onToggle={toggleSidebar}
          onSelectProject={(id) => {
            setActiveProjectId(id)
            setSettingsOpen(false)
          }}
          onOpenFolder={handleOpenFolder}
          onRemoveProject={handleRemoveProject}
          onOpenSettings={toggleSettings}
        />
      </div>
      {sidebarCollapsed && (
        <button
          className="sidebar-expand-btn"
          type="button"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3L11 8L6 13" />
          </svg>
        </button>
      )}
      <div className="main-pane">
        <Toolbar projectName={activeProject?.name ?? null} onOpenFolder={handleOpenFolder} />
        <div className="main-content">{mainContent}</div>
        <Composer />
      </div>
    </div>
  )
}
