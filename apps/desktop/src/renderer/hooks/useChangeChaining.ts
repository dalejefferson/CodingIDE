/**
 * useChangeChaining — manages the element-picker change-chaining workflow.
 *
 * When the user picks elements via the browser element picker, each pick
 * is paired with a text instruction describing the desired change.
 * The collected changes are then formatted as a single prompt and sent
 * to the Claude terminal drawer.
 */

import { useState, useCallback } from 'react'
import type { BrowserViewMode } from '@shared/types'

interface PickedChange {
  element: string
  instruction: string
}

interface UseChangeChainingOptions {
  setViewMode: (mode: BrowserViewMode) => void
  setDrawerOpen: (open: boolean) => void
  setDrawerPendingCommand: (cmd: string | undefined) => void
}

export function useChangeChaining({
  setViewMode,
  setDrawerOpen,
  setDrawerPendingCommand,
}: UseChangeChainingOptions) {
  const [pickedChanges, setPickedChanges] = useState<PickedChange[]>([])
  const [pendingPick, setPendingPick] = useState<string | null>(null)
  const [changeInput, setChangeInput] = useState('')

  const handlePickElement = useCallback((formatted: string) => {
    setPendingPick(formatted)
    setChangeInput('')
  }, [])

  const handleSubmitChange = useCallback(() => {
    if (!pendingPick || !changeInput.trim()) return
    setPickedChanges((prev) => [...prev, { element: pendingPick, instruction: changeInput.trim() }])
    setPendingPick(null)
    setChangeInput('')
  }, [pendingPick, changeInput])

  const handleRemoveChange = useCallback((index: number) => {
    setPickedChanges((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSendToClaude = useCallback(() => {
    if (pickedChanges.length === 0) return
    const lines = ['Use /task to make the following UI changes in parallel:']
    pickedChanges.forEach((change, i) => {
      lines.push('')
      lines.push(`${i + 1}. ${change.element.split('\n')[0]}`)
      lines.push(`   Change: ${change.instruction}`)
    })
    const prompt = lines.join('\n')
    const escaped = prompt.replace(/'/g, "'\\''")
    setViewMode('split')
    setDrawerOpen(true)
    setDrawerPendingCommand(`cc '${escaped}'`)
    setPickedChanges([])
    setPendingPick(null)
    setChangeInput('')
  }, [pickedChanges, setViewMode, setDrawerOpen, setDrawerPendingCommand])

  const handleClearChanges = useCallback(() => {
    setPickedChanges([])
    setPendingPick(null)
    setChangeInput('')
  }, [])

  return {
    pickedChanges,
    pendingPick,
    changeInput,
    setPendingPick,
    setChangeInput,
    handlePickElement,
    handleSubmitChange,
    handleRemoveChange,
    handleSendToClaude,
    handleClearChanges,
  }
}
