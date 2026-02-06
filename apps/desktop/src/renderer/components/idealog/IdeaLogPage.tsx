import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useIdeas } from '../../hooks/useIdeas'
import { useDragIdea } from '../../hooks/useDragIdea'
import { IdeaEditForm } from './IdeaEditForm'
import { IdeaCard } from './IdeaCard'
import { IdeaQuickAdd } from './IdeaQuickAdd'
import type { Idea, IdeaPriority, Project } from '@shared/types'
import '../../styles/IdeaLog.css'

interface IdeaLogPageProps {
  projects: Project[]
  onOpenFolder?: () => void
  onBuildAsApp?: (idea: Idea) => void
  onSendToBacklog?: (idea: Idea) => void
  onWorkInTerminal?: (idea: Idea) => void
}

export function IdeaLogPage({
  projects,
  onOpenFolder,
  onBuildAsApp,
  onSendToBacklog,
  onWorkInTerminal,
}: IdeaLogPageProps) {
  const { ideas, loading, createIdea, updateIdea, deleteIdea } = useIdeas()
  const { dragState, getDragProps, getDropZoneProps } = useDragIdea({ updateIdea })

  // ── Filters ──────────────────────────────────────────────────
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)

  // ── Quick-add form state ─────────────────────────────────────
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDescription, setQuickDescription] = useState('')
  const [quickProjectId, setQuickProjectId] = useState<string | null>(null)
  const [quickPriority, setQuickPriority] = useState<string | null>(null)
  const [showExpanded, setShowExpanded] = useState(false)

  // ── Edit form state ──────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editProjectId, setEditProjectId] = useState<string | null>(null)
  const [editPriority, setEditPriority] = useState<string | null>(null)

  // ── Refs ─────────────────────────────────────────────────────
  const quickInputRef = useRef<HTMLInputElement>(null)

  // ── Folder collapse state ────────────────────────────────────
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const didInitCollapse = useRef(false)

  // Auto-collapse empty project folders on first load
  useEffect(() => {
    if (didInitCollapse.current || loading) return
    didInitCollapse.current = true
    const projectsWithIdeas = new Set(ideas.map((i) => i.projectId).filter(Boolean))
    const emptyIds = projects.filter((p) => !projectsWithIdeas.has(p.id)).map((p) => p.id)
    if (emptyIds.length > 0) setCollapsedFolders(new Set(emptyIds))
  }, [loading, ideas, projects])

  // ── Derived data ─────────────────────────────────────────────

  const filteredIdeas = useMemo(() => {
    let result = ideas
    if (filterProjectId) result = result.filter((i) => i.projectId === filterProjectId)
    if (filterPriority) result = result.filter((i) => i.priority === filterPriority)
    return result
  }, [ideas, filterProjectId, filterPriority])

  const inboxIdeas = useMemo(
    () => filteredIdeas.filter((i) => i.projectId === null),
    [filteredIdeas],
  )

  const ideasByProject = useMemo(() => {
    const map = new Map<string, Idea[]>()
    for (const idea of filteredIdeas) {
      if (idea.projectId) {
        const list = map.get(idea.projectId) ?? []
        list.push(idea)
        map.set(idea.projectId, list)
      }
    }
    return map
  }, [filteredIdeas])

  const visibleProjects = useMemo(() => {
    if (filterProjectId) {
      return projects.filter((p) => p.id === filterProjectId)
    }
    return projects
  }, [projects, filterProjectId])

  // ── Helpers ──────────────────────────────────────────────────

  const getProjectName = useCallback(
    (projectId: string | null) => {
      if (!projectId) return null
      return projects.find((p) => p.id === projectId)?.name ?? null
    },
    [projects],
  )

  const resetQuickAdd = useCallback(() => {
    setQuickTitle('')
    setQuickDescription('')
    setQuickProjectId(null)
    setQuickPriority(null)
    setShowExpanded(false)
  }, [])

  const handleFolderClick = useCallback(
    (projectId: string) => {
      if (filterProjectId === projectId) {
        setFilterProjectId(null)
      } else {
        setFilterProjectId(projectId)
      }
      setCollapsedFolders((prev) => {
        const next = new Set(prev)
        next.delete(projectId)
        return next
      })
    },
    [filterProjectId],
  )

  // ── Handlers ─────────────────────────────────────────────────

  const handleQuickCreate = useCallback(async () => {
    if (!quickTitle.trim()) return
    await createIdea({
      title: quickTitle.trim(),
      description: quickDescription.trim(),
      projectId: quickProjectId,
      priority: quickPriority as IdeaPriority | null,
    })
    resetQuickAdd()
  }, [quickTitle, quickDescription, quickProjectId, quickPriority, createIdea, resetQuickAdd])

  const handleQuickInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (quickTitle.trim()) {
          handleQuickCreate()
        } else {
          setShowExpanded(true)
        }
      }
      if (e.key === 'Escape') {
        resetQuickAdd()
      }
    },
    [quickTitle, handleQuickCreate, resetQuickAdd],
  )

  const handleQuickTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleQuickCreate()
      }
      if (e.key === 'Escape') {
        resetQuickAdd()
      }
    },
    [handleQuickCreate, resetQuickAdd],
  )

  const handleQuickAddBtnClick = useCallback(() => {
    if (quickTitle.trim()) {
      handleQuickCreate()
    } else {
      setShowExpanded(true)
    }
  }, [quickTitle, handleQuickCreate])

  const handleStartEdit = useCallback(
    (id: string) => {
      const idea = ideas.find((i) => i.id === id)
      if (!idea) return
      setEditingId(id)
      setEditTitle(idea.title)
      setEditDescription(idea.description)
      setEditProjectId(idea.projectId)
      setEditPriority(idea.priority ?? null)
    },
    [ideas],
  )

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editTitle.trim()) return
    await updateIdea({
      id: editingId,
      title: editTitle.trim(),
      description: editDescription.trim(),
      projectId: editProjectId,
      priority: editPriority as IdeaPriority | null,
    })
    setEditingId(null)
  }, [editingId, editTitle, editDescription, editProjectId, editPriority, updateIdea])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteIdea(id)
      if (editingId === id) setEditingId(null)
    },
    [deleteIdea, editingId],
  )

  const handleEditInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSaveEdit()
      }
      if (e.key === 'Escape') {
        handleCancelEdit()
      }
    },
    [handleSaveEdit, handleCancelEdit],
  )

  const handleEditTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSaveEdit()
      }
      if (e.key === 'Escape') {
        handleCancelEdit()
      }
    },
    [handleSaveEdit, handleCancelEdit],
  )

  const handleGhostCardClick = useCallback(() => {
    quickInputRef.current?.focus()
    quickInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  // ── Render helpers ───────────────────────────────────────────

  const renderCard = (idea: Idea, showProjectBadge: boolean) => {
    if (editingId === idea.id) {
      return (
        <IdeaEditForm
          key={idea.id}
          idea={idea}
          editTitle={editTitle}
          editDescription={editDescription}
          editProjectId={editProjectId}
          editPriority={editPriority}
          projects={projects}
          onEditTitleChange={setEditTitle}
          onEditDescriptionChange={setEditDescription}
          onEditProjectIdChange={setEditProjectId}
          onEditPriorityChange={setEditPriority}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
          onInputKeyDown={handleEditInputKeyDown}
          onTextareaKeyDown={handleEditTextareaKeyDown}
        />
      )
    }

    return (
      <IdeaCard
        key={idea.id}
        idea={idea}
        showProjectBadge={showProjectBadge}
        isDragging={dragState.draggingId === idea.id}
        projectName={getProjectName(idea.projectId)}
        dragProps={getDragProps(idea.id)}
        onStartEdit={handleStartEdit}
        onDelete={handleDelete}
        onBuildAsApp={onBuildAsApp}
        onSendToBacklog={onSendToBacklog}
        onWorkInTerminal={onWorkInTerminal}
      />
    )
  }

  // ── Loading state ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="idea-log">
        <div className="idea-log__header">
          <h1>Idea Log</h1>
        </div>
        <div className="idea-log__loading">Loading...</div>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────

  return (
    <div className="idea-log">
      {/* HEADER */}
      <div className="idea-log__header">
        <h1>Idea Log</h1>
        <div className="idea-log__header-actions">
          <select
            className="idea-log__filter"
            value={filterProjectId ?? ''}
            onChange={(e) => setFilterProjectId(e.target.value || null)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="idea-log__filter"
            value={filterPriority ?? ''}
            onChange={(e) => setFilterPriority(e.target.value || null)}
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* TWO-COLUMN BODY */}
      <div className="idea-log__body">
        {/* LEFT: INBOX */}
        <div
          className={`idea-log__inbox${dragState.dragOverTarget === 'inbox' ? ' idea-log__inbox--drag-over' : ''}`}
          {...getDropZoneProps('inbox')}
        >
          <div className="idea-log__inbox-header">
            <h2 className="idea-log__inbox-title">
              {filterProjectId ? getProjectName(filterProjectId) ?? 'Inbox' : 'Inbox'}
            </h2>
            <span className="idea-log__inbox-count">
              {filterProjectId ? filteredIdeas.length : inboxIdeas.length}
            </span>
          </div>
          <div className="idea-log__inbox-list">
            {filterProjectId ? (
              <>
                {filteredIdeas.length === 0 && (
                  <div className="idea-log__empty">
                    <p>No ideas for this project.</p>
                  </div>
                )}
                {filteredIdeas.map((idea) => renderCard(idea, false))}
              </>
            ) : (
              <>
                {inboxIdeas.length === 0 && (
                  <div className="idea-log__empty">
                    <p>No unassigned ideas.</p>
                  </div>
                )}
                {inboxIdeas.map((idea) => renderCard(idea, true))}
              </>
            )}
            <div
              className="idea-log__ghost-card"
              onClick={handleGhostCardClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleGhostCardClick()
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M7 2v10M2 7h10" />
              </svg>
              Add an idea...
            </div>
          </div>
        </div>

        {/* RIGHT: PROJECT FOLDERS */}
        <div className="idea-log__folders">
          <div className="idea-log__folders-header">
            <h2 className="idea-log__folders-title">Projects</h2>
            {onOpenFolder && (
              <button className="idea-log__icon-btn" onClick={onOpenFolder} title="Add project">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M7 2v10M2 7h10" />
                </svg>
              </button>
            )}
          </div>
          <div className="idea-log__folders-list">
            {visibleProjects.map((project) => {
              const projectIdeas = ideasByProject.get(project.id) ?? []
              const isCollapsed = collapsedFolders.has(project.id)
              const isDragOver = dragState.dragOverTarget === project.id

              return (
                <div
                  key={project.id}
                  className={`idea-log__folder${isCollapsed ? ' idea-log__folder--collapsed' : ''}${isDragOver ? ' idea-log__folder--drag-over' : ''}${filterProjectId === project.id ? ' idea-log__folder--active' : ''}`}
                  {...getDropZoneProps(project.id)}
                >
                  <div className="idea-log__folder-header" onClick={() => handleFolderClick(project.id)}>
                    <h3 className="idea-log__folder-name">
                      <span className="idea-log__folder-chevron">
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
                          {isCollapsed ? (
                            <path d="M4.5 2.5l3.5 3.5-3.5 3.5" />
                          ) : (
                            <path d="M2.5 4.5l3.5 3.5 3.5-3.5" />
                          )}
                        </svg>
                      </span>
                      {project.name}
                    </h3>
                    <span className="idea-log__folder-count">{projectIdeas.length}</span>
                  </div>
                  {!isCollapsed && (
                    <div className="idea-log__folder-body">
                      {projectIdeas.length === 0 ? (
                        <div className="idea-log__folder-empty">Drop ideas here</div>
                      ) : (
                        projectIdeas.map((idea) => renderCard(idea, false))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* QUICK ADD BAR -- pinned to bottom */}
      <IdeaQuickAdd
        quickInputRef={quickInputRef}
        quickTitle={quickTitle}
        quickDescription={quickDescription}
        quickProjectId={quickProjectId}
        quickPriority={quickPriority}
        showExpanded={showExpanded}
        projects={projects}
        onQuickTitleChange={setQuickTitle}
        onQuickDescriptionChange={setQuickDescription}
        onQuickProjectIdChange={setQuickProjectId}
        onQuickPriorityChange={setQuickPriority}
        onInputKeyDown={handleQuickInputKeyDown}
        onTextareaKeyDown={handleQuickTextareaKeyDown}
        onAddBtnClick={handleQuickAddBtnClick}
        onQuickCreate={handleQuickCreate}
        onReset={resetQuickAdd}
        onFocusInput={() => !showExpanded && setShowExpanded(false)}
      />
    </div>
  )
}
