/**
 * Runtime type guard for Word Vomit IPC payload.
 *
 * Same validation approach as other validator files: manual type guards, zero dependencies.
 */

/** Payload must be a valid GenerateWordVomitPRDRequest */
export function isGenerateWordVomitPRDRequest(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return typeof obj['rawIdea'] === 'string' && obj['rawIdea'].length > 0
}
