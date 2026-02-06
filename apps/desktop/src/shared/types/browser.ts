import type { BrowserViewMode } from './core'

// ── Browser / Element Picker ────────────────────────────────

/** Payload produced by the element picker when user clicks an element in the browser pane. */
export interface ElementPickerPayload {
  /** CSS selector that uniquely targets the element */
  selector: string
  /** Trimmed innerText (max 200 chars) */
  innerText: string
  /** HTML tag name (lowercase) */
  tag: string
  /** Element id attribute, or null */
  id: string | null
  /** List of CSS class names */
  classes: string[]
  /** Key attributes (href, src, type, role, aria-label, data-testid) */
  attributes: Record<string, string>
}

/** Request to navigate the embedded browser to a URL. */
export interface BrowserNavigateRequest {
  url: string
}

/** Request to persist a project's browser state (URL and/or view mode). */
export interface SetProjectBrowserRequest {
  id: string
  browserUrl?: string | null
  browserViewMode?: BrowserViewMode | null
}

// ── Git ─────────────────────────────────────────────────────

export interface GitBranchRequest {
  cwd: string
}

export interface GitBranchResponse {
  branch: string | null
}
