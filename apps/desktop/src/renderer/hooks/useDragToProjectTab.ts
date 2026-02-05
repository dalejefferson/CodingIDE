import { useRef, useCallback } from 'react'

/**
 * Tracks pointer position during a @hello-pangea/dnd drag and detects
 * when the card is released over a project tab (identified by
 * `data-drop-project-id` attribute).
 *
 * Uses direct DOM class toggling to highlight tabs without triggering
 * React re-renders during drag.
 */
export function useDragToProjectTab() {
  const highlightedTabRef = useRef<HTMLElement | null>(null)
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const listenerRef = useRef<((e: PointerEvent) => void) | null>(null)

  const clearHighlight = useCallback(() => {
    highlightedTabRef.current?.classList.remove('project-tab--drop-target')
    highlightedTabRef.current = null
  }, [])

  const startTracking = useCallback(() => {
    const onPointerMove = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY }

      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      const tab = elements.find(
        (el) => el instanceof HTMLElement && el.hasAttribute('data-drop-project-id'),
      ) as HTMLElement | undefined

      if (tab !== highlightedTabRef.current) {
        clearHighlight()
        if (tab) {
          tab.classList.add('project-tab--drop-target')
          highlightedTabRef.current = tab
        }
      }
    }

    listenerRef.current = onPointerMove
    window.addEventListener('pointermove', onPointerMove)
  }, [clearHighlight])

  /**
   * Stop tracking and return the project ID if the pointer ended over
   * a project tab, or null otherwise.
   */
  const stopTracking = useCallback((): string | null => {
    if (listenerRef.current) {
      window.removeEventListener('pointermove', listenerRef.current)
      listenerRef.current = null
    }

    const tab = highlightedTabRef.current
    const projectId = tab?.getAttribute('data-drop-project-id') ?? null
    clearHighlight()
    return projectId
  }, [clearHighlight])

  return { startTracking, stopTracking }
}
