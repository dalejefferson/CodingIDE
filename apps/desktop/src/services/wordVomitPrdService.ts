/**
 * Word Vomit PRD generation service.
 *
 * Takes a raw brain dump and produces a structured general-purpose PRD.
 * Uses native `fetch` (available in Node 18+) — no SDK dependency needed.
 * Dual-provider pattern: tries Claude first, falls back to OpenAI.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'
const ANTHROPIC_VERSION = '2023-06-01'

/** Build the system prompt for transforming raw ideas into a structured PRD. */
function buildSystemPrompt(): string {
  return `You are a product manager who excels at taking raw, unstructured ideas and turning them into clear, actionable PRDs (Product Requirements Documents).

The user will give you a brain dump — a stream-of-consciousness description of their idea. It may be messy, incomplete, or rambling. Your job is to extract the core intent and produce a structured PRD in markdown with these sections:

## Overview
Brief summary of the product/feature idea.

## Problem Statement
What problem does this solve? Who has this problem?

## User Stories
Numbered list of user stories in the format: "As a [user], I want [goal] so that [benefit]."

## Requirements
### Functional Requirements
Numbered list of concrete features and behaviors.

### Non-Functional Requirements
Performance, security, accessibility, scalability considerations.

## Technical Approach
High-level implementation approach and architecture suggestions.

## Success Criteria
How to verify the product/feature is complete and working.

## Out of Scope
What is explicitly NOT included in this version.

Keep the PRD concise but thorough. Use bullet points and numbered lists.
Infer reasonable defaults for anything the user didn't specify.
If the idea is vague, make sensible assumptions and note them.`
}

/** Generate a PRD from raw idea using OpenAI. */
async function generateWithOpenAI(apiKey: string, rawIdea: string): Promise<string> {
  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: rawIdea },
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

/** Generate a PRD from raw idea using Anthropic. */
async function generateWithAnthropic(apiKey: string, rawIdea: string): Promise<string> {
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 3000,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: rawIdea }],
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
 * Generate a general-purpose PRD from a raw idea.
 *
 * Claude-preferred fallback: tries Claude key first, falls back to OpenAI.
 * At least one API key must be provided.
 */
export async function generateWordVomitPRD(
  claudeKey: string | null,
  openaiKey: string | null,
  rawIdea: string,
): Promise<string> {
  // Try Claude first (preferred)
  if (claudeKey) {
    try {
      return await generateWithAnthropic(claudeKey, rawIdea)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (!openaiKey) {
        throw new Error(`Claude API failed and no OpenAI key available: ${message}`)
      }
      console.warn(`Claude API failed, falling back to OpenAI: ${message}`)
    }
  }

  // Fall back to OpenAI
  if (openaiKey) {
    return await generateWithOpenAI(openaiKey, rawIdea)
  }

  throw new Error('No API keys available. Add a Claude or OpenAI API key in Settings.')
}
