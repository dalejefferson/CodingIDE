/**
 * PaneHeader — CWD + git branch bar at the top of each terminal pane.
 */

import '../styles/PaneHeader.css'

interface PaneHeaderProps {
  cwd: string
  gitBranch: string | null
}

/** Replace the user's home directory with ~ for display */
function shortenPath(fullPath: string): string {
  // On macOS, home is typically /Users/username
  // We use a simple heuristic: if path starts with /Users/X, replace with ~
  const homeMatch = fullPath.match(/^\/Users\/[^/]+/)
  if (homeMatch) {
    return fullPath.replace(homeMatch[0], '~')
  }
  return fullPath
}

export function PaneHeader({ cwd, gitBranch }: PaneHeaderProps) {
  const displayPath = shortenPath(cwd)

  return (
    <div className="pane-header">
      <div className="pane-header-cwd">
        <svg
          className="pane-header-icon"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 5.5V13a1 1 0 001 1h10a1 1 0 001-1V6.5a1 1 0 00-1-1H8.5L7 4H3a1 1 0 00-1 1.5z" />
        </svg>
        <span className="pane-header-path" title={cwd}>
          {displayPath}
        </span>
      </div>
      {gitBranch && (
        <div className="pane-header-branch">
          <svg
            className="pane-header-icon"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="5" cy="4" r="2" />
            <circle cx="5" cy="12" r="2" />
            <circle cx="11" cy="8" r="2" />
            <path d="M5 6v4M9 8H7c-1.1 0-2-.9-2-2" />
          </svg>
          <span className="pane-header-branch-name">{gitBranch}</span>
        </div>
      )}
    </div>
  )
}
