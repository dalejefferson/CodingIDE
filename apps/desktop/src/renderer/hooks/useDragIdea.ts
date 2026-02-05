import { useState, useCallback, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────

interface UseDragIdeaOptions {
  updateIdea: (request: { id: string; projectId?: string | null }) => Promise<void>
}

interface DragState {
  /** ID of the idea currently being dragged, or null */
  draggingId: string | null
  /** ID of the drop zone currently being hovered, or null. 'inbox' for the inbox zone */
  dragOverTarget: string | null
}

interface UseDragIdeaReturn {
  dragState: DragState
  /** Props to spread on a draggable idea card */
  getDragProps: (ideaId: string) => {
    draggable: true
    onDragStart: (e: React.DragEvent) => void
    onDragEnd: () => void
  }
  /** Props to spread on a drop zone (folder or inbox) */
  getDropZoneProps: (targetId: string) => {
    onDragOver: (e: React.DragEvent) => void
    onDragEnter: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
}

// ── Constants ──────────────────────────────────────────────────

const DRAG_MIME = 'text/x-idea-id'
const INBOX_TARGET = 'inbox'

// ── Hook ───────────────────────────────────────────────────────

export function useDragIdea({ updateIdea }: UseDragIdeaOptions): UseDragIdeaReturn {
  const [dragState, setDragState] = useState<DragState>({
    draggingId: null,
    dragOverTarget: null,
  })

  // Per-drop-zone enter/leave counter to handle nested child elements.
  // Key = targetId, Value = current enter count.
  const enterCountRef = useRef<Map<string, number>>(new Map())

  // ── Drag source handlers ───────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, ideaId: string) => {
    e.dataTransfer.setData(DRAG_MIME, ideaId)
    e.dataTransfer.effectAllowed = 'move'
    setDragState((prev) => ({ ...prev, draggingId: ideaId }))
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragState({ draggingId: null, dragOverTarget: null })
    enterCountRef.current.clear()
  }, [])

  // ── Drop zone handlers ────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const counts = enterCountRef.current
    const current = counts.get(targetId) ?? 0
    counts.set(targetId, current + 1)

    // Only set target on first real enter (counter goes from 0 to 1)
    if (current === 0) {
      setDragState((prev) => ({ ...prev, dragOverTarget: targetId }))
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const counts = enterCountRef.current
    const current = counts.get(targetId) ?? 0
    const next = Math.max(0, current - 1)
    counts.set(targetId, next)

    // Only clear target when counter drops back to 0
    if (next === 0) {
      setDragState((prev) => ({
        ...prev,
        dragOverTarget: prev.dragOverTarget === targetId ? null : prev.dragOverTarget,
      }))
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault()

      const ideaId = e.dataTransfer.getData(DRAG_MIME)
      if (!ideaId) return

      // Reset counter for this zone
      enterCountRef.current.delete(targetId)

      const projectId = targetId === INBOX_TARGET ? null : targetId
      updateIdea({ id: ideaId, projectId })

      setDragState({ draggingId: null, dragOverTarget: null })
      enterCountRef.current.clear()
    },
    [updateIdea],
  )

  // ── Prop getters ──────────────────────────────────────────

  const getDragProps = useCallback(
    (ideaId: string) => ({
      draggable: true as const,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, ideaId),
      onDragEnd: handleDragEnd,
    }),
    [handleDragStart, handleDragEnd],
  )

  const getDropZoneProps = useCallback(
    (targetId: string) => ({
      onDragOver: handleDragOver,
      onDragEnter: (e: React.DragEvent) => handleDragEnter(e, targetId),
      onDragLeave: (e: React.DragEvent) => handleDragLeave(e, targetId),
      onDrop: (e: React.DragEvent) => handleDrop(e, targetId),
    }),
    [handleDragOver, handleDragEnter, handleDragLeave, handleDrop],
  )

  return { dragState, getDragProps, getDropZoneProps }
}
