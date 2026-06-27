import type { Lesson } from '../lessons/types'
import {
  normalizeGeneratedPracticeProblems,
  type GeneratedPracticeCandidate,
} from './generatedPractice'
import { getPracticeTopics } from './practiceTopics'

interface PracticeResponse {
  problems?: GeneratedPracticeCandidate[]
}

/** Endpoint of the server-side OpenAI proxy (see api/generate-practice.ts). */
const PRACTICE_ENDPOINT = '/api/generate-practice'

/**
 * Raised when the practice service returns text we can't turn into usable
 * problems (malformed/truncated JSON, or zero valid problems).
 */
class PracticeOutputError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'PracticeOutputError'
  }
}

/** Returns the substring from the first `{` to the last `}`, or null. */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

/**
 * Parses the model's text response into practice problems. Because we only use
 * the plain completions feature (no JSON mode), the model may wrap JSON in code
 * fences or prose, so we strip fences and, failing that, extract the outermost
 * JSON object before parsing.
 */
function parsePracticeResponse(
  rawText: string,
  lessonUid: string,
): ReturnType<typeof normalizeGeneratedPracticeProblems> {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: PracticeResponse | null = null
  for (const candidate of [cleaned, extractJsonObject(cleaned)]) {
    if (!candidate) continue
    try {
      parsed = JSON.parse(candidate) as PracticeResponse
      break
    } catch {
      // Try the next candidate before giving up.
    }
  }

  if (!parsed) {
    throw new PracticeOutputError(
      'The model did not return valid JSON. With only the basic chat ' +
        'completions feature enabled, parseable output is not guaranteed — the ' +
        'feature needed to fix this is JSON mode / Structured Outputs ' +
        '(the `response_format` option), which requires a key/model that ' +
        'supports it.',
    )
  }

  const problems = normalizeGeneratedPracticeProblems(
    lessonUid,
    parsed.problems ?? [],
  )

  if (problems.length === 0) {
    throw new PracticeOutputError('No usable practice problems were generated.')
  }

  return problems
}

function buildPracticePrompt(lesson: Lesson): string {
  const topics = getPracticeTopics(lesson.uid)
  return `Generate one retrieval-practice problem for each topic below.

Lesson: ${lesson.displayName}
Lesson summary: ${lesson.text}

Topics:
${topics
  .map(
    (topic) =>
      `- topicId: ${topic.id}
  name: ${topic.name}
  focus: ${topic.focus}
  likely units: ${topic.unitSuggestions.join(', ')}`,
  )
  .join('\n')}

Rules:
- Return exactly ${topics.length} problems.
- Use only the listed topicId values.
- Make each problem relevant to its topic and to this lesson.
- Each question should ask for one numeric answer only.
- Keep arithmetic simple enough for mental or scratch-paper work.
- Round final answers to at most one decimal place when needed.
- Do not include hints; hints are supplied by the app.
- The explanation should be concise and show the key substitution.
- Respond with a JSON object of the form: {"problems":[{"topicId":"...","question":"...","answer":<number>,"explanation":"...","unit":"..."}]}.`
}

/**
 * Generates runtime practice problems by calling the server-side OpenAI proxy.
 * The browser never sees the API key; it only POSTs a prompt and receives the
 * model's JSON text, which is parsed and normalized here.
 */
export async function loadGeneratedPracticeProblems(lesson: Lesson) {
  let response: Response
  try {
    response = await fetch(PRACTICE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildPracticePrompt(lesson) }),
    })
  } catch (error) {
    throw new Error(
      `Could not reach the practice service: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    )
  }

  if (!response.ok) {
    let detail: string
    try {
      const body = (await response.json()) as { error?: string }
      detail = body.error ?? ''
    } catch {
      detail = await response.text().catch(() => '')
    }
    throw new Error(
      `Practice generation failed (${response.status}).${detail ? ` ${detail}` : ''}`,
    )
  }

  const data = (await response.json()) as { text?: string }
  if (!data.text) {
    throw new PracticeOutputError(
      'The practice service returned an empty response.',
    )
  }

  return parsePracticeResponse(data.text, lesson.uid)
}
