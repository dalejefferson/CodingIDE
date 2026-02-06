import { useCallback } from 'react'

export const PIP_MIN_W = 280
export const PIP_MIN_H = 200
export const PIP_MAX_W = 1200
export const PIP_MAX_H = 900

interface UsePipResizeOptions {
  pipPos: { x: number; y: number } | null
  pipSize: { w: number; h: number }
  setPipPos: (pos: { x: number; y: number }) => void
  setPipSize: (size: { w: number; h: number }) => void
}

export function usePipResize({ pipPos, pipSize, setPipPos, setPipSize }: UsePipResizeOptions) {
  const handlePipDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!pipPos) return
      e.preventDefault()
      const startX = e.clientX - pipPos.x
      const startY = e.clientY - pipPos.y
      let rafId = 0
      const onMouseMove = (ev: MouseEvent) => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const x = Math.max(-350, Math.min(window.innerWidth - 50, ev.clientX - startX))
          const y = Math.max(0, Math.min(window.innerHeight - 50, ev.clientY - startY))
          setPipPos({ x, y })
        })
      }
      const onMouseUp = () => {
        cancelAnimationFrame(rafId)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [pipPos, setPipPos],
  )

  const handlePipResizeStart = useCallback(
    (e: React.MouseEvent, edge: string) => {
      if (!pipPos) return
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const startW = pipSize.w
      const startH = pipSize.h
      const startPosX = pipPos.x
      const startPosY = pipPos.y

      let rafId = 0
      const onMouseMove = (ev: MouseEvent) => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const dx = ev.clientX - startX
          const dy = ev.clientY - startY
          let newW = startW
          let newH = startH
          let newX = startPosX
          let newY = startPosY

          if (edge.includes('e')) newW = Math.max(PIP_MIN_W, Math.min(PIP_MAX_W, startW + dx))
          if (edge.includes('s')) newH = Math.max(PIP_MIN_H, Math.min(PIP_MAX_H, startH + dy))
          if (edge.includes('w')) {
            const proposedW = startW - dx
            newW = Math.max(PIP_MIN_W, Math.min(PIP_MAX_W, proposedW))
            newX = startPosX + (startW - newW)
          }
          if (edge.includes('n')) {
            const proposedH = startH - dy
            newH = Math.max(PIP_MIN_H, Math.min(PIP_MAX_H, proposedH))
            newY = startPosY + (startH - newH)
          }

          setPipSize({ w: newW, h: newH })
          setPipPos({ x: newX, y: newY })
        })
      }

      const onMouseUp = () => {
        cancelAnimationFrame(rafId)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [pipPos, pipSize, setPipPos, setPipSize],
  )

  return { handlePipDragStart, handlePipResizeStart }
}
