import React, { useCallback, useMemo, useRef } from 'react'
import type { LayoutNode } from '@shared/terminalLayout'
import { TerminalPane } from '../TerminalPane'

export interface LayoutRendererProps {
  node: LayoutNode
  activeLeafId: string | null
  projectId: string
  cwd: string
  palette: string
  pendingCommands: Record<string, string>
  onFocusLeaf: (id: string) => void
  onRatioChange: (branchId: string, newRatio: number) => void
  onCommandSent: (terminalId: string) => void
  onLocalhostDetected?: (terminalId: string, url: string) => void
}

/** Wrapper that passes stable callbacks to TerminalPane without inline closures. */
export const LeafPane = React.memo(function LeafPane({
  leafId,
  terminalId,
  projectId,
  cwd,
  isActive,
  palette,
  pendingCommand,
  onFocusLeaf,
  onCommandSent,
  onLocalhostDetected,
}: {
  leafId: string
  terminalId: string
  projectId: string
  cwd: string
  isActive: boolean
  palette: string
  pendingCommand?: string
  onFocusLeaf: (id: string) => void
  onCommandSent: (terminalId: string) => void
  onLocalhostDetected?: (terminalId: string, url: string) => void
}) {
  const handleFocus = useCallback(() => onFocusLeaf(leafId), [onFocusLeaf, leafId])
  const handleCommandSent = useCallback(
    () => onCommandSent(terminalId),
    [onCommandSent, terminalId],
  )
  const handleLocalhostDetected = useMemo(
    () => (onLocalhostDetected ? (url: string) => onLocalhostDetected(terminalId, url) : undefined),
    [onLocalhostDetected, terminalId],
  )

  return (
    <TerminalPane
      terminalId={terminalId}
      projectId={projectId}
      cwd={cwd}
      isActive={isActive}
      palette={palette}
      pendingCommand={pendingCommand}
      onFocus={handleFocus}
      onCommandSent={handleCommandSent}
      onLocalhostDetected={handleLocalhostDetected}
    />
  )
})

export const LayoutRenderer = React.memo(function LayoutRenderer({
  node,
  activeLeafId,
  projectId,
  cwd,
  palette,
  pendingCommands,
  onFocusLeaf,
  onRatioChange,
  onCommandSent,
  onLocalhostDetected,
}: LayoutRendererProps) {
  if (node.type === 'leaf') {
    return (
      <LeafPane
        key={node.id}
        leafId={node.id}
        terminalId={node.terminalId}
        projectId={projectId}
        cwd={cwd}
        isActive={node.id === activeLeafId}
        palette={palette}
        pendingCommand={pendingCommands[node.terminalId]}
        onFocusLeaf={onFocusLeaf}
        onCommandSent={onCommandSent}
        onLocalhostDetected={onLocalhostDetected}
      />
    )
  }

  const isHorizontal = node.direction === 'horizontal'
  const firstPercent = `${node.ratio * 100}%`
  const secondPercent = `${(1 - node.ratio) * 100}%`

  return (
    <div
      className={`terminal-split terminal-split--${node.direction}`}
      style={{
        flexDirection: isHorizontal ? 'row' : 'column',
      }}
    >
      <div className="terminal-split-child" style={{ flexBasis: firstPercent }}>
        <LayoutRenderer
          key={node.children[0].id}
          node={node.children[0]}
          activeLeafId={activeLeafId}
          projectId={projectId}
          cwd={cwd}
          palette={palette}
          pendingCommands={pendingCommands}
          onFocusLeaf={onFocusLeaf}
          onRatioChange={onRatioChange}
          onCommandSent={onCommandSent}
          onLocalhostDetected={onLocalhostDetected}
        />
      </div>
      <SplitDivider branchId={node.id} direction={node.direction} onRatioChange={onRatioChange} />
      <div className="terminal-split-child" style={{ flexBasis: secondPercent }}>
        <LayoutRenderer
          key={node.children[1].id}
          node={node.children[1]}
          activeLeafId={activeLeafId}
          projectId={projectId}
          cwd={cwd}
          palette={palette}
          pendingCommands={pendingCommands}
          onFocusLeaf={onFocusLeaf}
          onRatioChange={onRatioChange}
          onCommandSent={onCommandSent}
          onLocalhostDetected={onLocalhostDetected}
        />
      </div>
    </div>
  )
})

/** Interactive split divider with drag-to-resize */
export const SplitDivider = React.memo(function SplitDivider({
  branchId,
  direction,
  onRatioChange,
}: {
  branchId: string
  direction: 'horizontal' | 'vertical'
  onRatioChange: (branchId: string, newRatio: number) => void
}) {
  const dividerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()

      const parent = dividerRef.current?.parentElement
      if (!parent) return

      const isH = direction === 'horizontal'
      document.body.classList.add(isH ? 'is-resizing-h' : 'is-resizing-v')

      const parentRect = parent.getBoundingClientRect()
      const totalSize = isH ? parentRect.width : parentRect.height
      const parentStart = isH ? parentRect.left : parentRect.top

      let rafId = 0
      const onMouseMove = (ev: MouseEvent) => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const pos = isH ? ev.clientX : ev.clientY
          const newRatio = (pos - parentStart) / totalSize
          onRatioChange(branchId, newRatio)
        })
      }

      const onMouseUp = () => {
        cancelAnimationFrame(rafId)
        document.body.classList.remove('is-resizing-h', 'is-resizing-v')
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [branchId, direction, onRatioChange],
  )

  return <div ref={dividerRef} className="terminal-split-divider" onMouseDown={handleMouseDown} />
})
