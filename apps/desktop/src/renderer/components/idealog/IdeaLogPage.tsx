import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useIdeas } from '../../hooks/useIdeas'
import { useDragIdea } from '../../hooks/useDragIdea'
import { useIdeaEditForm } from '../../hooks/useIdeaEditForm'
import { useIdeaQuickAdd } from '../../hooks/useIdeaQuickAdd'
import { IdeaEditForm } from './IdeaEditForm'
import { IdeaCard } from './IdeaCard'
import { IdeaQuickAdd } from './IdeaQuickAdd'
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
  const { ideas, loading, createIdea, updateIdea, deleteIdea } = useIdeas()
  const { dragState, getDragProps, getDropZoneProps } = useDragIdea({ updateIdea })

  const edit = useIdeaEditForm({ ideas, updateIdea })
  const quickAdd = useIdeaQuickAdd({ createIdea })

  const [filterProjectId, setFilterProjectId] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const didInitCollapse = useRef(false)

  useEffect(() => {
    if (didInitCollapse.current || loading) return
    didInitCollapse.current = true
    const projectsWithIdeas = new Set(ideas.map((i) => i.projectId).filter(Boolean))
    const emptyIds = projects.filter((p) => !projectsWithIdeas.has(p.id)).map((p) => p.id)
    if (emptyIds.length > 0) setCollapsedFolders(new Set(emptyIds))
  }, [loading, ideas, projects])

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

  const visibleProjects = useMemo(
    () => (filterProjectId ? projects.filter((p) => p.id === filterProjectId) : projects),
    [projects, filterProjectId],
  )

  const getProjectName = useCallback(
    (pid: string | null) => (pid ? projects.find((p) => p.id === pid)?.name ?? null : null),
    [projects],
  )

  const handleFolderClick = useCallback(
    (projectId: string) => {
      setFilterProjectId((prev) => (prev === projectId ? null : projectId))
      setCollapsedFolders((prev) => { const next = new Set(prev); next.delete(projectId); return next })
    },
    [],
  )

  const handleDelete = useCallback(
    (id: string) => edit.handleDelete(id, deleteIdea),
    [edit, deleteIdea],
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
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          {isCollapsed ? <path d="M4.5 2.5l3.5 3.5-3.5 3.5" /> : <path d="M2.5 4.5l3.5 3.5 3.5-3.5" />}
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

      {/* QUICK ADD BAR */}
      <IdeaQuickAdd
        quickInputRef={quickAdd.quickInputRef}
        quickTitle={quickAdd.quickTitle}
        quickDescription={quickAdd.quickDescription}
        quickProjectId={quickAdd.quickProjectId}
        quickPriority={quickAdd.quickPriority}
        showExpanded={quickAdd.showExpanded}
        projects={projects}
        onQuickTitleChange={quickAdd.setQuickTitle}
        onQuickDescriptionChange={quickAdd.setQuickDescription}
        onQuickProjectIdChange={quickAdd.setQuickProjectId}
        onQuickPriorityChange={quickAdd.setQuickPriority}
        onInputKeyDown={quickAdd.handleQuickInputKeyDown}
        onTextareaKeyDown={quickAdd.handleQuickTextareaKeyDown}
        onAddBtnClick={quickAdd.handleQuickAddBtnClick}
        onQuickCreate={quickAdd.handleQuickCreate}
        onReset={quickAdd.resetQuickAdd}
        onFocusInput={() => !quickAdd.showExpanded && quickAdd.setShowExpanded(false)}
      />
    </div>
  )
}
