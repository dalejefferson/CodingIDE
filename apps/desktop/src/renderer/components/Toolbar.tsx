import '../styles/Toolbar.css'

interface ToolbarProps {
  projectName: string | null
  onOpenFolder: () => void
}

export function Toolbar({ projectName, onOpenFolder }: ToolbarProps) {
  return (
    <div className="toolbar">
      {/* Left: breadcrumb / title area */}
      <div className="toolbar-left">
        <span className="toolbar-title">{projectName ?? 'CodingIDE'}</span>
      </div>

      {/* Right: action buttons + diff indicator */}
      <div className="toolbar-right">
        {/* Diff indicator */}
        <span className="toolbar-diff">
          <span className="toolbar-diff-add">+12</span>
          <span className="toolbar-diff-del">-3</span>
        </span>

        {/* Open button */}
        <button type="button" className="toolbar-btn" onClick={onOpenFolder}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 4.5h4l1.5 -2h4.5a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-9a1 1 0 0 1 -1 -1v-7z" />
            <path d="M2 4.5v-1a1 1 0 0 1 1 -1h3.5" />
          </svg>
          Open
        </button>

        {/* Commit button */}
        <button type="button" className="toolbar-btn" onClick={() => {}}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.5 8.5l3 3l6 -6" />
          </svg>
          Commit
        </button>
      </div>
    </div>
  )
}
