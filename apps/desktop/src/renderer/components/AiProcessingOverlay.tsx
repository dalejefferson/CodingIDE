import React from 'react'

export const AiProcessingOverlay = React.memo(function AiProcessingOverlay() {
  return (
    <div className="terminal-ai-overlay">
      <div className="terminal-ai-overlay-content">
        <div className="terminal-ai-spinner">
          <span className="terminal-ai-dot" />
          <span className="terminal-ai-dot" />
          <span className="terminal-ai-dot" />
        </div>
        <span className="terminal-ai-label">Claude is working&hellip;</span>
      </div>
    </div>
  )
})
