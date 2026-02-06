// ── Idea Log ────────────────────────────────────────────────

export type IdeaPriority = 'low' | 'medium' | 'high'

export const IDEA_PRIORITIES: readonly IdeaPriority[] = ['low', 'medium', 'high'] as const

export interface Idea {
  id: string
  title: string
  description: string
  projectId: string | null
  priority: IdeaPriority | null
  createdAt: number
  updatedAt: number
  order: number
}

export interface CreateIdeaRequest {
  title: string
  description: string
  projectId: string | null
  priority: IdeaPriority | null
}

export interface UpdateIdeaRequest {
  id: string
  title?: string
  description?: string
  projectId?: string | null
  priority?: IdeaPriority | null
}
