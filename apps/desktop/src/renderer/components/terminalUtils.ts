/** Standard ANSI colors — fixed across all palettes so terminal text stays readable. */
export const ANSI_COLORS = {
  black: '#1d1f21',
  red: '#ff5f56',
  green: '#5af78e',
  yellow: '#f3f99d',
  blue: '#57c7ff',
  magenta: '#ff6ac1',
  cyan: '#9aedfe',
  white: '#f1f1f0',
  brightBlack: '#686868',
  brightRed: '#ff6e67',
  brightGreen: '#5af78e',
  brightYellow: '#f4f99d',
  brightBlue: '#57c7ff',
  brightMagenta: '#ff6ac1',
  brightCyan: '#9aedfe',
  brightWhite: '#ffffff',
} as const

/** Palette-aware terminal theme — reads CSS custom properties from the active palette. */
let _cachedXtermTheme: Record<string, string> | null = null
let _cachedPaletteAttr: string | null = null

export function getXtermTheme(): Record<string, string> {
  const paletteAttr = document.documentElement.getAttribute('data-palette') ?? ''
  if (_cachedXtermTheme && _cachedPaletteAttr === paletteAttr) return _cachedXtermTheme
  const style = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  _cachedXtermTheme = {
    background: v('--terminal-bg', '#1c2128'),
    // Use a fixed neutral foreground so default text color stays consistent
    // across all palettes — palette-specific --terminal-fg tinted text colors.
    foreground: '#d4dae0',
    cursor: v('--color-accent', '#ff9b51'),
    cursorAccent: v('--terminal-bg', '#1c2128'),
    selectionBackground: v('--terminal-selection-bg', 'rgba(255, 155, 81, 0.22)'),
    selectionForeground: '#f0f0f4',
    ...ANSI_COLORS,
  }
  _cachedPaletteAttr = paletteAttr
  return _cachedXtermTheme
}

/** Strip all ANSI escape sequences (CSI, OSC, single-char escapes) */
export function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  const CSI = /\x1b\[[0-9;?]*[a-zA-Z]/g
  // eslint-disable-next-line no-control-regex
  const OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g
  // eslint-disable-next-line no-control-regex
  const CHARSET = /\x1b[()][AB012]/g
  // eslint-disable-next-line no-control-regex
  const MISC = /\x1b[>=<NOM78HDEFZ]/g
  return s.replace(CSI, '').replace(OSC, '').replace(CHARSET, '').replace(MISC, '')
}

/** Regex to detect localhost URLs in terminal output */
export const LOCALHOST_RE = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)(?:\/[^\s'")>]*)?/g

/** Context keywords that indicate a frontend dev server */
export const DEV_SERVER_RE =
  /\b(?:vite|hmr|hot\s*module|webpack|next(?:\.js)?|nuxt|svelte|angular|react|dev\s*server|compiled\s*(?:in|successfully)|ready\s*in|app\s*running|Local:|Network:)\b/i

/** Context keywords that indicate an API / backend server */
export const API_SERVER_RE =
  /\b(?:api\s*(?:server|listening|started|running)|express|fastify|nestjs|flask|django|uvicorn|gunicorn|rails|sinatra|graphql|rest\s*api|backend\s*(?:server|listening|running|started))\b/i

/** Well-known frontend dev server ports — used to break ties between ambiguous URLs. */
export const DEV_SERVER_PORTS = new Set([3000, 3001, 4200, 4321, 5173, 5174, 8000, 8080, 8888])

/** Extract port number from a URL string, defaults to 80. */
export function extractPort(url: string): number {
  const match = url.match(/:(\d+)/)
  return match ? parseInt(match[1], 10) : 80
}

/** Collected URL entry for the detection window. */
export interface CollectedUrl {
  url: string
  classification: 'dev' | 'api' | 'ambiguous'
  port: number
}

/**
 * Classify whether the terminal context around a URL indicates a dev server,
 * an API/backend server, or is ambiguous.
 */
export function classifyServerUrl(context: string): 'dev' | 'api' | 'ambiguous' {
  const hasDev = DEV_SERVER_RE.test(context)
  const hasApi = API_SERVER_RE.test(context)
  if (hasDev) return 'dev'
  if (hasApi) return 'api'
  return 'ambiguous'
}

/**
 * Pick the best URL from a set of candidates collected during the detection window.
 *
 * Priority:
 * 1. Definite dev server (has dev keywords in context)
 * 2. Ambiguous URL on a well-known dev server port
 * 3. Ambiguous URL on any port
 * 4. null if everything is an API server
 */
export function pickBestUrl(candidates: CollectedUrl[]): string | null {
  // 1. Prefer definite dev servers
  const devUrls = candidates.filter((c) => c.classification === 'dev')
  if (devUrls.length > 0) {
    // Among dev URLs, prefer well-known ports
    const onKnownPort = devUrls.find((c) => DEV_SERVER_PORTS.has(c.port))
    return (onKnownPort ?? devUrls[0]).url
  }

  // 2. Ambiguous URLs — prefer well-known dev server ports
  const ambiguous = candidates.filter((c) => c.classification === 'ambiguous')
  if (ambiguous.length > 0) {
    const onKnownPort = ambiguous.find((c) => DEV_SERVER_PORTS.has(c.port))
    return (onKnownPort ?? ambiguous[0]).url
  }

  // 3. All are API servers — don't open browser
  return null
}
