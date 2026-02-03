import '../styles/Composer.css'

function Composer() {
  return (
    <div className="composer">
      <div className="composer-input-wrapper">
        <button className="composer-model-picker" type="button">
          <span className="composer-model-name">Opus 4.5</span>
          <svg
            className="composer-chevron"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </button>

        <input className="composer-input" type="text" placeholder="Ask anything..." readOnly />

        <button className="composer-send-button" type="button" aria-label="Send">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 12V4" />
            <path d="M4 7L8 3L12 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default Composer
