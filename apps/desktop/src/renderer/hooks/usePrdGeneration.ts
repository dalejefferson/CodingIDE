import { useState, useCallback, useRef } from 'react'
import type { ExpoTemplate } from '@shared/types'

// ── Generation state types ────────────────────────────────────────

export interface WordVomitGen {
  status: 'generating' | 'done' | 'error'
  rawIdea: string
  result: string | null
  error: string | null
}

export interface TicketPrdGen {
  status: 'generating' | 'done' | 'error'
  ticketId: string
  error: string | null
}

export interface MobilePrdGen {
  status: 'generating' | 'done' | 'error'
  result: string | null
  error: string | null
}

// ── Toast helper ─────────────────────────────────────────────────

function showPrdToast(message: string, kind: 'prd' | 'warning' = 'prd') {
  window.dispatchEvent(
    new CustomEvent('app:show-toast', {
      detail: { kind, projectId: '', projectName: '', message },
    }),
  )
}

// ── Hook ──────────────────────────────────────────────────────────

export function usePrdGeneration() {
  const [wordVomit, setWordVomit] = useState<WordVomitGen | null>(null)
  const [ticketPrd, setTicketPrd] = useState<TicketPrdGen | null>(null)
  const [mobilePrd, setMobilePrd] = useState<MobilePrdGen | null>(null)

  // Guard against double-fire while an IPC call is in flight
  const wvInFlight = useRef(false)
  const ticketInFlight = useRef(false)
  const mobileInFlight = useRef(false)

  // ── Word Vomit ────────────────────────────────────────────────

  const startWordVomitGen = useCallback((rawIdea: string) => {
    if (wvInFlight.current) return
    wvInFlight.current = true
    setWordVomit({ status: 'generating', rawIdea, result: null, error: null })

    window.electronAPI.wordVomit
      .generatePRD({ rawIdea })
      .then((res) => {
        setWordVomit({ status: 'done', rawIdea, result: res.content, error: null })
        showPrdToast('PRD generated successfully')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setWordVomit({ status: 'error', rawIdea, result: null, error: msg })
        showPrdToast(`PRD generation failed: ${msg}`, 'warning')
      })
      .finally(() => {
        wvInFlight.current = false
      })
  }, [])

  const clearWordVomit = useCallback(() => {
    setWordVomit(null)
  }, [])

  // ── Ticket PRD ────────────────────────────────────────────────

  const startTicketPrdGen = useCallback((ticketId: string) => {
    if (ticketInFlight.current) return
    ticketInFlight.current = true
    setTicketPrd({ status: 'generating', ticketId, error: null })

    window.electronAPI.prd
      .generate({ ticketId })
      .then(() => {
        // Result is persisted in ticketStore; renderer refreshes via broadcast
        setTicketPrd({ status: 'done', ticketId, error: null })
        showPrdToast('PRD generated successfully')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setTicketPrd({ status: 'error', ticketId, error: msg })
        showPrdToast(`PRD generation failed: ${msg}`, 'warning')
      })
      .finally(() => {
        ticketInFlight.current = false
      })
  }, [])

  const clearTicketPrd = useCallback(() => {
    setTicketPrd(null)
  }, [])

  // ── Mobile PRD ────────────────────────────────────────────────

  const startMobilePrdGen = useCallback(
    (appDescription: string, template: ExpoTemplate, paletteId?: string, imagePaths?: string[]) => {
      if (mobileInFlight.current) return
      mobileInFlight.current = true
      setMobilePrd({ status: 'generating', result: null, error: null })

      window.electronAPI.expo
        .generatePRD({ appDescription, template, paletteId, imagePaths })
        .then((res) => {
          setMobilePrd({ status: 'done', result: res.content, error: null })
          showPrdToast('PRD generated successfully')
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          setMobilePrd({ status: 'error', result: null, error: msg })
          showPrdToast(`PRD generation failed: ${msg}`, 'warning')
        })
        .finally(() => {
          mobileInFlight.current = false
        })
    },
    [],
  )

  const clearMobilePrd = useCallback(() => {
    setMobilePrd(null)
  }, [])

  // ── Derived ───────────────────────────────────────────────────

  const isAnyGenerating =
    wordVomit?.status === 'generating' ||
    ticketPrd?.status === 'generating' ||
    mobilePrd?.status === 'generating'

  return {
    wordVomit,
    ticketPrd,
    mobilePrd,
    isAnyGenerating: !!isAnyGenerating,
    startWordVomitGen,
    clearWordVomit,
    startTicketPrdGen,
    clearTicketPrd,
    startMobilePrdGen,
    clearMobilePrd,
  }
}
