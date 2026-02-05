import { useState, useEffect, useCallback } from 'react'
import type { Idea, CreateIdeaRequest, UpdateIdeaRequest } from '@shared/types'

export interface UseIdeasReturn {
  ideas: Idea[]
  loading: boolean
  createIdea: (request: CreateIdeaRequest) => Promise<Idea>
  updateIdea: (request: UpdateIdeaRequest) => Promise<void>
  deleteIdea: (id: string) => Promise<void>
}

export function useIdeas(): UseIdeasReturn {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const all = await window.electronAPI.ideas.getAll()
        if (!cancelled) setIdeas(all.sort((a, b) => b.createdAt - a.createdAt))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const createIdea = useCallback(async (request: CreateIdeaRequest): Promise<Idea> => {
    const idea = await window.electronAPI.ideas.create(request)
    setIdeas((prev) => [idea, ...prev])
    return idea
  }, [])

  const updateIdea = useCallback(async (request: UpdateIdeaRequest): Promise<void> => {
    await window.electronAPI.ideas.update(request)
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === request.id
          ? {
              ...i,
              ...(request.title !== undefined && { title: request.title }),
              ...(request.description !== undefined && { description: request.description }),
              ...(request.projectId !== undefined && { projectId: request.projectId }),
              ...(request.priority !== undefined && { priority: request.priority }),
              updatedAt: Date.now(),
            }
          : i,
      ),
    )
  }, [])

  const deleteIdea = useCallback(async (id: string): Promise<void> => {
    await window.electronAPI.ideas.delete(id)
    setIdeas((prev) => prev.filter((i) => i.id !== id))
  }, [])

  return { ideas, loading, createIdea, updateIdea, deleteIdea }
}
