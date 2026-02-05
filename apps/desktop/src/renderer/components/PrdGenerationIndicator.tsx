import '../styles/PrdGenerationIndicator.css'

interface PrdGenerationIndicatorProps {
  isGenerating: boolean
}

export function PrdGenerationIndicator({ isGenerating }: PrdGenerationIndicatorProps) {
  if (!isGenerating) return null

  return (
    <div className="prd-indicator">
      <span className="prd-indicator__spinner" />
      <span className="prd-indicator__text">Generating PRD...</span>
    </div>
  )
}
