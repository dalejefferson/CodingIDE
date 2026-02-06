import React, { useState, useCallback } from 'react'
import type { Ticket } from '@shared/types'

const fi = { fontFamily: 'inherit' } as const

interface TicketPRDSectionProps {
  ticket: Ticket
  generatingPRD: boolean
  displayPrdError: string | null
  onGeneratePRD: (ticketId: string) => void
  onApprovePRD: (ticketId: string) => Promise<void>
  onClearPrdGenError?: () => void
}

export const TicketPRDSection = React.memo(function TicketPRDSection({
  ticket,
  generatingPRD,
  displayPrdError,
  onGeneratePRD,
  onApprovePRD,
  onClearPrdGenError,
}: TicketPRDSectionProps) {
  const [localError, setLocalError] = useState<string | null>(null)
  const error = displayPrdError ?? localError

  const handleGenerate = useCallback(() => {
    setLocalError(null)
    onClearPrdGenError?.()
    onGeneratePRD(ticket.id)
  }, [ticket.id, onGeneratePRD, onClearPrdGenError])

  return (
    <div className="ticket-detail-section">
      <h3 className="ticket-detail-section-title" style={fi}>
        PRD
      </h3>
      {!ticket.prd && (
        <>
          <button
            className="ticket-detail-btn ticket-detail-btn--accent"
            style={fi}
            disabled={generatingPRD}
            onClick={handleGenerate}
          >
            {generatingPRD ? (
              <>
                <span className="ticket-detail-spinner" />
                Generating...
              </>
            ) : (
              'Generate PRD'
            )}
          </button>
          {error && (
            <p className="ticket-detail-prd-error" style={fi}>
              {error}
            </p>
          )}
        </>
      )}
      {ticket.prd && !ticket.prd.approved && (
        <div className="ticket-detail-prd">
          <pre className="ticket-detail-prd-content" style={fi}>
            {ticket.prd.content}
          </pre>
          <button
            className="ticket-detail-btn ticket-detail-btn--accent"
            style={fi}
            onClick={() => onApprovePRD(ticket.id)}
          >
            Approve PRD
          </button>
        </div>
      )}
      {ticket.prd && ticket.prd.approved && (
        <span className="ticket-detail-badge ticket-detail-badge--prd-approved" style={fi}>
          PRD Approved
        </span>
      )}
    </div>
  )
})
