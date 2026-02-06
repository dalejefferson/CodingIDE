/**
 * useIdeaQuickAdd — manages the quick-add form state at the bottom of the
 * Idea Log page. Owns title, description, projectId, priority, expanded
 * state, and keyboard/button handlers for creating ideas.
 */

import { useState, useCallback } from 'react'
import type { IdeaPriority } from '@shared/types'

interface UseIdeaQuickAddOptions {
  createIdea: (idea: {
    title: string
    description: string
    projectId: string | null
    priority: IdeaPriority | null
  }) => Promise<unknown>
}

export function useIdeaQuickAdd({ createIdea }: UseIdeaQuickAddOptions) {
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDescription, setQuickDescription] = useState('')
  const [quickProjectId, setQuickProjectId] = useState<string | null>(null)
  const [quickPriority, setQuickPriority] = useState<string | null>(null)
  const [showExpanded, setShowExpanded] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const resetQuickAdd = useCallback(() => {
    setQuickTitle('')
    setQuickDescription('')
    setQuickProjectId(null)
    setQuickPriority(null)
    setShowExpanded(false)
    setIsAdding(false)
  }, [])

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

  const handleGhostCardClick = useCallback(() => {
    setIsAdding(true)
  }, [])

  return {
    quickTitle,
    quickDescription,
    quickProjectId,
    quickPriority,
    showExpanded,
    isAdding,
    setQuickTitle,
    setQuickDescription,
    setQuickProjectId,
    setQuickPriority,
    setShowExpanded,
    resetQuickAdd,
    handleQuickCreate,
    handleQuickInputKeyDown,
    handleQuickTextareaKeyDown,
    handleQuickAddBtnClick,
    handleGhostCardClick,
  }
}
