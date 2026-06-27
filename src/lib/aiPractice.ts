import { getGenerativeModel, Schema, type GenerativeModel } from 'firebase/ai'
import { ai } from '../firebase/config'
import type { Lesson } from '../lessons/types'
import {
  normalizeGeneratedPracticeProblems,
  type GeneratedPracticeCandidate,
} from './generatedPractice'
import { getPracticeTopics } from './practiceTopics'

interface PracticeResponse {
  problems?: GeneratedPracticeCandidate[]
}

/**
 * Models tried in order. The first is preferred; later entries are fallbacks
 * used when an earlier model is overloaded or rate limited.
 *
 * Practice generation is a short, latency-sensitive, structured-JSON task, so
 * the primary is `gemini-3.1-flash-lite` — Google's fastest/cheapest Gemini 3
 * model — with the heavier `gemini-3.5-flash` and the 2.5 Flash family as
 * quality/availability fallbacks.
 */
const PRACTICE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const

const practiceResponseSchema = Schema.object({
  properties: {
    problems: Schema.array({
      items: Schema.object({
        properties: {
          topicId: Schema.string(),
          question: Schema.string(),
          answer: Schema.number(),
          explanation: Schema.string(),
          unit: Schema.string(),
        },
      }),
    }),
  },
})

const modelCache = new Map<string, GenerativeModel>()

/** Lazily builds and caches a configured model so each name is created once. */
function getPracticeModel(modelName: string): GenerativeModel {
  const cached = modelCache.get(modelName)
  if (cached) return cached

  const model = getGenerativeModel(ai, {
    model: modelName,
    systemInstruction:
      'You are a careful physics tutor generating short numeric retrieval-practice problems for an interactive lesson app. Use accurate physics, simple numbers, and exactly one numeric answer per problem.',
    generationConfig: {
      temperature: 0.35,
      // Generous ceiling so a verbose set of explanations is never truncated
      // mid-JSON (a truncated response throws "Unterminated string in JSON").
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: practiceResponseSchema,
    },
  })
  modelCache.set(modelName, model)
  return model
}

/**
 * Raised when a model returns a response we can't turn into usable problems
 * (malformed/truncated JSON, or zero valid problems). It's worth retrying a
 * different model, since output quality varies between models.
 */
class PracticeOutputError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'PracticeOutputError'
  }
}

/**
 * Parses a model's text response into practice problems. Tolerates responses
 * wrapped in Markdown code fences and surfaces truncated/invalid JSON as a
 * {@link PracticeOutputError} so the caller can fall back to another model.
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

  let parsed: PracticeResponse
  try {
    parsed = JSON.parse(cleaned) as PracticeResponse
  } catch (error) {
    throw new PracticeOutputError(
      'The model returned malformed or truncated JSON.',
      { cause: error },
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

/**
 * Returns true for transient errors where retrying with a different model is
 * worthwhile: server overload (500/502/503), unavailability, rate/quota limits
 * (429), or unusable output. Permanent errors (bad request, auth) should not
 * trigger fallback since every model would reject them the same way.
 */
function isRetriableModelError(error: unknown): boolean {
  if (error instanceof PracticeOutputError) return true
  const message = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase()
  return (
    /\b(429|500|502|503|504)\b/.test(message) ||
    message.includes('high demand') ||
    message.includes('overloaded') ||
    message.includes('unavailable') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit') ||
    message.includes('quota')
  )
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
- The explanation should be concise and show the key substitution.`
}

/** Runs one generation attempt against a single model and normalizes output. */
async function generateWithModel(modelName: string, lesson: Lesson) {
  const result = await getPracticeModel(modelName).generateContent(
    buildPracticePrompt(lesson),
  )
  return parsePracticeResponse(result.response.text(), lesson.uid)
}

/**
 * Generates runtime practice problems with Firebase AI Logic.
 *
 * Tries each model in {@link PRACTICE_MODELS} in order. If a model is
 * overloaded or rate limited, it falls back to the next free model so a
 * transient capacity spike on one model doesn't break practice generation.
 */
export async function loadGeneratedPracticeProblems(lesson: Lesson) {
  let lastError: unknown

  for (let i = 0; i < PRACTICE_MODELS.length; i += 1) {
    const modelName = PRACTICE_MODELS[i]
    try {
      return await generateWithModel(modelName, lesson)
    } catch (error) {
      lastError = error
      const hasFallback = i < PRACTICE_MODELS.length - 1
      // Only fall back on transient errors; rethrow permanent ones immediately.
      if (!hasFallback || !isRetriableModelError(error)) {
        throw error
      }
      console.warn(
        `[aiPractice] Model "${modelName}" failed, falling back to "${PRACTICE_MODELS[i + 1]}".`,
        error,
      )
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Practice generation failed across all models.')
}
