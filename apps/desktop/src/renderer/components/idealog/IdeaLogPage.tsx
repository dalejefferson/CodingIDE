import { useState, useCallback, useMemo } from 'react'
import { useIdeas } from '../../hooks/useIdeas'
import { useDragIdea } from '../../hooks/useDragIdea'
import { useIdeaEditForm } from '../../hooks/useIdeaEditForm'
import { useIdeaQuickAdd } from '../../hooks/useIdeaQuickAdd'
import { IdeaEditForm } from './IdeaEditForm'
import { IdeaCard } from './IdeaCard'
import { IdeaInlineAdd } from './IdeaInlineAdd'
import type { Idea, Project } from '@shared/types'
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
  const { ideas, loading, createIdea, updateIdea, deleteIdea, deleteIdeasByProjectId } = useIdeas()
  const { dragState, getDragProps, getDropZoneProps } = useDragIdea({ updateIdea })

  const edit = useIdeaEditForm({ ideas, updateIdea })
  const quickAdd = useIdeaQuickAdd({ createIdea })

  const [filterProjectId, setFilterProjectId] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
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

  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null)
  const [removedProjectIds, setRemovedProjectIds] = useState<Set<string>>(new Set())

  // Merge main project list with orphaned project IDs from ideas.
  // Projects removed from the sidebar still appear here if they have ideas.
  // Exclude projects the user has explicitly removed from the Idea Log.
  const visibleProjects = useMemo(() => {
    const projectMap = new Map(projects.map((p) => [p.id, p]))
    const orphanIds = new Set<string>()
    for (const idea of ideas) {
      if (idea.projectId && !projectMap.has(idea.projectId)) {
        orphanIds.add(idea.projectId)
      }
    }
    const orphanProjects: Project[] = [...orphanIds].map((id) => ({
      id,
      name: id,
      path: '',
      status: 'idle' as const,
      addedAt: 0,
    }))
    return [...projects, ...orphanProjects].filter((p) => !removedProjectIds.has(p.id))
  }, [projects, ideas, removedProjectIds])

  const getProjectName = useCallback(
    (pid: string | null) =>
      pid ? visibleProjects.find((p) => p.id === pid)?.name ?? pid : null,
    [visibleProjects],
  )

  const handleFolderClick = useCallback(
    (projectId: string) => {
      setFilterProjectId((prev) => (prev === projectId ? null : projectId))
    },
    [],
  )

  const handleDelete = useCallback(
    (id: string) => edit.handleDelete(id, deleteIdea),
    [edit, deleteIdea],
  )

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      await deleteIdeasByProjectId(projectId)
      setRemovedProjectIds((prev) => new Set(prev).add(projectId))
      if (filterProjectId === projectId) setFilterProjectId(null)
      setConfirmDeleteProjectId(null)
    },
    [deleteIdeasByProjectId, filterProjectId],
  )

  const renderCard = (idea: Idea, showProjectBadge: boolean) => {
    if (edit.editingId === idea.id) {
      return (
        <IdeaEditForm
          key={idea.id}
          idea={idea}
          editTitle={edit.editTitle}
          editDescription={edit.editDescription}
          editProjectId={edit.editProjectId}
          editPriority={edit.editPriority}
          projects={projects}
          onEditTitleChange={edit.setEditTitle}
          onEditDescriptionChange={edit.setEditDescription}
          onEditProjectIdChange={edit.setEditProjectId}
          onEditPriorityChange={edit.setEditPriority}
          onSave={edit.handleSaveEdit}
          onCancel={edit.handleCancelEdit}
          onInputKeyDown={edit.handleEditInputKeyDown}
          onTextareaKeyDown={edit.handleEditTextareaKeyDown}
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
        onStartEdit={edit.handleStartEdit}
        onDelete={handleDelete}
        onBuildAsApp={onBuildAsApp}
        onSendToBacklog={onSendToBacklog}
        onWorkInTerminal={onWorkInTerminal}
      />
    )
  }

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
            {visibleProjects.map((p) => (
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
                  <div className="idea-log__empty"><p>No ideas for this project.</p></div>
                )}
                {filteredIdeas.map((idea) => renderCard(idea, false))}
              </>
            ) : (
              <>
                {inboxIdeas.length === 0 && (
                  <div className="idea-log__empty"><p>No unassigned ideas.</p></div>
                )}
                {inboxIdeas.map((idea) => renderCard(idea, true))}
              </>
            )}
            {quickAdd.isAdding ? (
              <IdeaInlineAdd
                quickTitle={quickAdd.quickTitle}
                quickProjectId={quickAdd.quickProjectId}
                quickPriority={quickAdd.quickPriority}
                showExpanded={quickAdd.showExpanded}
                projects={projects}
                onQuickTitleChange={quickAdd.setQuickTitle}
                onQuickProjectIdChange={quickAdd.setQuickProjectId}
                onQuickPriorityChange={quickAdd.setQuickPriority}
                onInputKeyDown={quickAdd.handleQuickInputKeyDown}
                onQuickCreate={quickAdd.handleQuickCreate}
                onCancel={quickAdd.resetQuickAdd}
                onExpandToggle={() => quickAdd.setShowExpanded(true)}
              />
            ) : (
              <div
                className="idea-log__ghost-card"
                onClick={quickAdd.handleGhostCardClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') quickAdd.handleGhostCardClick()
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M7 2v10M2 7h10" />
                </svg>
                Add an idea...
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: PROJECT FOLDERS */}
        <div className="idea-log__folders">
          <div className="idea-log__folders-header">
            <h2 className="idea-log__folders-title">Projects</h2>
            {onOpenFolder && (
              <button className="idea-log__icon-btn" onClick={onOpenFolder} title="Add project">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M7 2v10M2 7h10" />
                </svg>
              </button>
            )}
          </div>
          <div className="idea-log__folders-list">
            {visibleProjects.map((project) => {
              const projectIdeas = ideasByProject.get(project.id) ?? []
              const isDragOver = dragState.dragOverTarget === project.id
              const isConfirming = confirmDeleteProjectId === project.id
              return (
                <div
                  key={project.id}
                  className={`idea-log__folder${isDragOver ? ' idea-log__folder--drag-over' : ''}${filterProjectId === project.id ? ' idea-log__folder--active' : ''}`}
                  {...getDropZoneProps(project.id)}
                >
                  <div className="idea-log__folder-header" onClick={() => handleFolderClick(project.id)}>
                    <h3 className="idea-log__folder-name">
                      {project.name}
                    </h3>
                    <div className="idea-log__folder-actions">
                      <span className="idea-log__folder-count">{projectIdeas.length}</span>
                      <button
                        className="idea-log__folder-delete-btn"
                        title="Remove project and its ideas"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDeleteProjectId(project.id)
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M2 2l8 8M10 2l-8 8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {isConfirming && (
                    <div className="idea-log__folder-confirm">
                      <p className="idea-log__folder-confirm-msg">
                        Delete <strong>{project.name}</strong> and its{' '}
                        {projectIdeas.length} idea{projectIdeas.length !== 1 ? 's' : ''}?
                      </p>
                      <div className="idea-log__folder-confirm-actions">
                        <button
                          className="idea-log__btn idea-log__btn--ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteProjectId(null)
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="idea-log__btn idea-log__btn--danger"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(project.id)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}
