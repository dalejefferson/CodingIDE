import React, { useRef, useState, useEffect, useCallback } from 'react'
import type { Project, ClaudeStatusMap } from '@shared/types'
import '../styles/ProjectTabs.css'

interface ProjectTabsProps {
  projects: Project[]
  activeProjectId: string | null
  claudeStatus: ClaudeStatusMap
  onSelectProject: (id: string) => void
  onRemoveProject: (id: string) => void
}

function CloseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3l6 6M9 3l-6 6" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3L5 8L10 13" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3L11 8L6 13" />
    </svg>
  )
}

function ProjectTabs({
  projects,
  activeProjectId,
  claudeStatus,
  onSelectProject,
  onRemoveProject,
}: ProjectTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    checkOverflow()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkOverflow, { passive: true })
    const ro = new ResizeObserver(checkOverflow)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkOverflow)
      ro.disconnect()
    }
  }, [checkOverflow, projects.length])

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (!activeProjectId || !scrollRef.current) return
    const tab = scrollRef.current.querySelector(`[data-tab-id="${activeProjectId}"]`)
    if (tab) {
      tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeProjectId])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.6
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }, [])

  if (projects.length === 0) return null

  const showArrows = canScrollLeft || canScrollRight

  return (
    <div className="project-tabs-wrapper">
      {showArrows && (
        <button
          type="button"
          className={`project-tabs-arrow project-tabs-arrow--left${canScrollLeft ? '' : ' project-tabs-arrow--hidden'}`}
          onClick={() => scroll('left')}
          aria-label="Scroll tabs left"
          tabIndex={-1}
        >
          <ChevronLeftIcon />
        </button>
      )}
      <div className="project-tabs" ref={scrollRef}>
        {projects.map((project) => {
          const cStatus = claudeStatus[project.id]
          const isGenerating = cStatus === 'generating'
          const isWaiting = cStatus === 'waiting' || project.status === 'done'

          return (
            <div
              key={project.id}
              data-tab-id={project.id}
              className={`project-tab${activeProjectId === project.id ? ' project-tab--active' : ''}${isWaiting ? ' project-tab--done' : ''}${isGenerating ? ' project-tab--generating' : ''}`}
              onClick={() => onSelectProject(project.id)}
              role="tab"
              aria-selected={activeProjectId === project.id}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectProject(project.id)
                }
              }}
            >
              {isGenerating && <span className="project-tab-spinner" title="Generating" />}
              {isWaiting && <span className="project-tab-done-dot" title="Waiting for input" />}
              <span className="project-tab-name">{project.name}</span>
              <button
                type="button"
                className="project-tab-close"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveProject(project.id)
                }}
                aria-label={`Close ${project.name}`}
                title={`Remove ${project.name}`}
              >
                <CloseIcon />
              </button>
              {isGenerating && <div className="project-tab-claude-bar" />}
            </div>
          )
        })}
      </div>
      {showArrows && (
        <button
          type="button"
          className={`project-tabs-arrow project-tabs-arrow--right${canScrollRight ? '' : ' project-tabs-arrow--hidden'}`}
          onClick={() => scroll('right')}
          aria-label="Scroll tabs right"
          tabIndex={-1}
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  )
}

const MemoizedProjectTabs = React.memo(ProjectTabs)
export { MemoizedProjectTabs as ProjectTabs }
