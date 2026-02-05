/**
 * Mobile PRD generation service for React Native / Expo apps.
 *
 * Uses native `fetch` (available in Node 18+) — no SDK dependency needed.
 * Dual-provider pattern: tries Claude first, falls back to OpenAI.
 */

import type { ExpoTemplate } from '@shared/types'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'
const ANTHROPIC_VERSION = '2023-06-01'

/** Build the mobile-focused system prompt for PRD generation. */
function buildSystemPrompt(): string {
  return `You are a senior mobile product manager writing a PRD for a React Native / Expo app.

Given an app description, template type, and optional color palette, produce a structured mobile PRD in markdown with these sections:

## App Overview
Brief summary of what the app does and who it serves.

## Screen-by-Screen Requirements
For each screen in the app:
### Screen: [Name]
- **Purpose:** What this screen does
- **UI Elements:** List of components (buttons, inputs, cards, lists, etc.)
- **User Actions:** What the user can do on this screen
- **Data Displayed:** What information is shown
- **Navigation:** Where the user can go from here

## Navigation Structure
- Navigation type (stack, tabs, drawer) and how screens connect
- Deep link structure if applicable
- Back button / gesture behavior

## Component Hierarchy
High-level breakdown of reusable components:
- Component name, props, and where it's used
- Shared components vs screen-specific components

## Data Model
- Key entities and their fields
- Local state vs persisted data
- API endpoints if applicable

## Styling & Theme
- Color palette usage (primary, secondary, accent, background, surface, text)
- Typography scale (headings, body, captions)
- Spacing and layout patterns
- Dark mode considerations

## Non-Functional Requirements
- Performance targets (list rendering, navigation transitions)
- Accessibility (VoiceOver, Dynamic Type, touch targets)
- Offline behavior
- Platform differences (iOS vs Android)

## Success Criteria
How to verify the app is complete and working.

Keep the PRD concise but thorough. Use bullet points and numbered lists.
Focus on mobile-specific concerns: touch targets, gestures, safe areas, keyboard avoidance.`
}

/** Build the user message from the app description and options. */
function buildUserMessage(
  appDescription: string,
  template: ExpoTemplate,
  paletteId?: string,
): string {
  const parts = [
    `# App Description`,
    appDescription,
    '',
    `## Template: ${template}`,
    `The app uses the Expo "${template}" template as a starting point.`,
  ]

  if (paletteId) {
    parts.push(
      '',
      `## Color Palette: ${paletteId}`,
      `Use the "${paletteId}" color palette for styling guidance.`,
    )
  }

  return parts.join('\n')
}

/** Generate a mobile PRD using OpenAI. */
async function generateWithOpenAI(
  apiKey: string,
  appDescription: string,
  template: ExpoTemplate,
  paletteId?: string,
): Promise<string> {
  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserMessage(appDescription, template, paletteId) },
    ],
    temperature: 0.7,
    max_tokens: 3000,
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown error')
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`)
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')
  return content
}

/** Generate a mobile PRD using Anthropic. */
async function generateWithAnthropic(
  apiKey: string,
  appDescription: string,
  template: ExpoTemplate,
  paletteId?: string,
): Promise<string> {
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 3000,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage(appDescription, template, paletteId) }],
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown error')
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`)
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>
  }

  const content = data.content?.[0]?.text
  if (!content) throw new Error('Anthropic returned empty response')
  return content
}

/**
 * Generate a mobile-focused PRD for an Expo app.
 *
 * Claude-preferred fallback: tries Claude key first, falls back to OpenAI.
 * At least one API key must be provided.
 */
export async function generateMobilePRD(
  claudeKey: string | null,
  openaiKey: string | null,
  appDescription: string,
  template: ExpoTemplate,
  paletteId?: string,
): Promise<string> {
  // Try Claude first (preferred)
  if (claudeKey) {
    try {
      return await generateWithAnthropic(claudeKey, appDescription, template, paletteId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      // If no fallback available, throw
      if (!openaiKey) {
        throw new Error(`Claude API failed and no OpenAI key available: ${message}`)
      }
      // Otherwise fall through to OpenAI
      console.warn(`Claude API failed, falling back to OpenAI: ${message}`)
    }
  }

  // Fall back to OpenAI
  if (openaiKey) {
    return await generateWithOpenAI(openaiKey, appDescription, template, paletteId)
  }

  throw new Error('No API keys available. Provide a Claude or OpenAI API key.')
}
