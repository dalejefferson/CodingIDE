/**
 * OSC 7 Parser — extracts the current working directory from PTY output.
 *
 * Terminals emit OSC 7 escape sequences to report CWD changes:
 *   ESC]7;file://hostname/path BEL
 *   ESC]7;file://hostname/path ESC\
 *
 * This parser finds the last such sequence in a chunk of PTY data
 * and returns the decoded file path.
 */

// ESC = \x1b, BEL = \x07
// Using RegExp constructor to avoid ESLint no-control-regex on literal
// Pattern: ESC ] 7 ; file://hostname/path (BEL | ESC \)
// eslint-disable-next-line no-control-regex
const OSC7_PATTERN = /\x1b\]7;file:\/\/[^/]*(\/.+?)(?:\x07|\x1b\\)/g

/**
 * Extract the last CWD reported via OSC 7 in the given data chunk.
 * Returns the decoded file path, or null if no OSC 7 sequence is found.
 */
export function extractOsc7Cwd(data: string): string | null {
  // Reset lastIndex so the global regex works from the start each call
  OSC7_PATTERN.lastIndex = 0

  let lastMatch: string | null = null
  let match: RegExpExecArray | null

  while ((match = OSC7_PATTERN.exec(data)) !== null) {
    const captured = match[1]
    if (captured !== undefined) {
      lastMatch = captured
    }
  }

  if (lastMatch === null) return null

  // Decode percent-encoded characters (e.g., %20 for spaces)
  try {
    return decodeURIComponent(lastMatch)
  } catch {
    return lastMatch
  }
}
