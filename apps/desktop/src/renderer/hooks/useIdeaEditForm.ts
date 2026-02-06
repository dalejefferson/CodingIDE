/**
 * useIdeaEditForm — manages the inline edit-mode state for a single idea card.
 *
 * Owns the edit form fields (title, description, projectId, priority),
 * provides start/save/cancel handlers, and keyboard shortcuts for quick
 * save (Enter on title input, Cmd+Enter on textarea) and cancel (Escape).
 */

import { useState, useCallback } from 'react'
import type { Idea, IdeaPriority } from '@shared/types'

interface UseIdeaEditFormOptions {
  ideas: Idea[]
  updateIdea: (update: {
    id: string
    title: string
    description: string
    projectId: string | null
    priority: IdeaPriority | null
  }) => Promise<void>
}

export function useIdeaEditForm({ ideas, updateIdea }: UseIdeaEditFormOptions) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editProjectId, setEditProjectId] = useState<string | null>(null)
  const [editPriority, setEditPriority] = useState<string | null>(null)

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
    async (id: string, deleteIdea: (id: string) => Promise<void>) => {
      await deleteIdea(id)
      if (editingId === id) setEditingId(null)
    },
    [editingId],
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

  return {
    editingId,
    editTitle,
    editDescription,
    editProjectId,
    editPriority,
    setEditTitle,
    setEditDescription,
    setEditProjectId,
    setEditPriority,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleDelete,
    handleEditInputKeyDown,
    handleEditTextareaKeyDown,
  }
}
