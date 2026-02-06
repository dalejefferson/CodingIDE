import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { Project } from '@shared/types'
import { ChevronDownIcon } from './EmptyStateIcons'

interface ProjectPickerProps {
  projects: Project[]
  onSelectProject?: (id: string) => void
}

export const ProjectPicker = React.memo(function ProjectPicker({
  projects,
  onSelectProject,
}: ProjectPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!pickerOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    // Use a rAF so the opening click doesn't immediately close it
    const id = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside)
    })
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [pickerOpen])

  // Close on Escape
  useEffect(() => {
    if (!pickerOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setPickerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [pickerOpen])

  const handlePickerToggle = useCallback(() => {
    setPickerOpen((prev) => !prev)
  }, [])

  const handleSelectProject = useCallback(
    (id: string) => {
      setPickerOpen(false)
      onSelectProject?.(id)
    },
    [onSelectProject],
  )

  // Sort projects by most recently added (newest first)
  const sortedProjects = [...projects].sort((a, b) => b.addedAt - a.addedAt)

  return (
    <span ref={pickerRef} className="empty-state__project-picker-wrap">
      <span
        className={`empty-state__project-picker${pickerOpen ? ' empty-state__project-picker--open' : ''}`}
        onClick={handlePickerToggle}
      >
        CodingIDE
        <ChevronDownIcon />
      </span>
      {pickerOpen && (
        <div className="empty-state__dropdown">
          {sortedProjects.length > 0 ? (
            sortedProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                className="empty-state__dropdown-item"
                onClick={() => handleSelectProject(p.id)}
              >
                <span className="empty-state__dropdown-name">{p.name}</span>
                <span className="empty-state__dropdown-path">{p.path}</span>
              </button>
            ))
          ) : (
            <div className="empty-state__dropdown-empty">No recent projects</div>
          )}
        </div>
      )}
    </span>
  )
})
