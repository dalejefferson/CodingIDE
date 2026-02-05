/**
 * PRD generation service supporting both OpenAI and Anthropic APIs.
 *
 * Uses native `fetch` (available in Node 18+) — no SDK dependency needed.
 */

import type { Ticket, PRD } from '@shared/types'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'
const ANTHROPIC_VERSION = '2023-06-01'

/** Build the system prompt for PRD generation */
function buildSystemPrompt(): string {
  return `You are a product manager writing a PRD (Product Requirements Document) for a software feature.

Given a ticket with a title, description, and acceptance criteria, produce a structured PRD in markdown format with these sections:

## Overview
Brief summary of the feature

## Problem Statement
What problem this solves

## Requirements
### Functional Requirements
Numbered list of functional requirements derived from the description and acceptance criteria

### Non-Functional Requirements
Performance, security, accessibility considerations

## Technical Approach
High-level implementation approach

## Success Criteria
How to verify the feature is complete (derived from acceptance criteria)

## Out of Scope
What is explicitly NOT included

Keep the PRD concise but thorough. Use bullet points and numbered lists.`
}

/** Build the user message from a ticket */
function buildUserMessage(ticket: Ticket): string {
  const parts = [`# ${ticket.title}`, '', `## Description`, ticket.description]

  if (ticket.acceptanceCriteria.length > 0) {
    parts.push('', '## Acceptance Criteria')
    for (const criterion of ticket.acceptanceCriteria) {
      parts.push(`- ${criterion}`)
    }
  }

  parts.push('', `Type: ${ticket.type}`, `Priority: ${ticket.priority}`)

  return parts.join('\n')
}

/** Generate a PRD for the given ticket using OpenAI */
async function generateWithOpenAI(apiKey: string, ticket: Ticket): Promise<string> {
  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserMessage(ticket) },
    ],
    temperature: 0.7,
    max_tokens: 2000,
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

/** Generate a PRD for the given ticket using Anthropic */
async function generateWithAnthropic(apiKey: string, ticket: Ticket): Promise<string> {
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 2000,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage(ticket) }],
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

export type PRDProvider = 'openai' | 'anthropic'

/** Generate a PRD using the specified provider */
export async function generatePRD(
  apiKey: string,
  ticket: Ticket,
  provider: PRDProvider,
): Promise<PRD> {
  const content =
    provider === 'anthropic'
      ? await generateWithAnthropic(apiKey, ticket)
      : await generateWithOpenAI(apiKey, ticket)

  return { content, generatedAt: Date.now(), approved: false }
}
