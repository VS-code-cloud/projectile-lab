import { getPracticeTopics } from './practiceTopics'

export const PRACTICE_ATTEMPT_LIMIT = 3

export interface GeneratedPracticeCandidate {
  topicId: string
  question: string
  answer: number
  explanation: string
  unit?: string
}

export interface GeneratedPracticeProblem {
  uid: string
  topicId: string
  topicName: string
  question: string
  expected: number[]
  explanation: string
  hint: string
  unit?: string
}

function stableProblemId(problem: GeneratedPracticeCandidate): string {
  const input = `${problem.topicId}|${problem.question}|${problem.answer}|${problem.unit ?? ''}`
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = Math.imul(31, hash) + input.charCodeAt(i)
  }
  return Math.abs(hash).toString(36)
}

function isValidCandidate(
  candidate: GeneratedPracticeCandidate,
): candidate is GeneratedPracticeCandidate {
  return (
    typeof candidate.topicId === 'string' &&
    typeof candidate.question === 'string' &&
    candidate.question.trim().length > 0 &&
    typeof candidate.explanation === 'string' &&
    candidate.explanation.trim().length > 0 &&
    Number.isFinite(candidate.answer)
  )
}

/** Normalizes Gemini output into one usable generated question per known topic. */
export function normalizeGeneratedPracticeProblems(
  lessonUid: string,
  candidates: GeneratedPracticeCandidate[],
): GeneratedPracticeProblem[] {
  const topics = getPracticeTopics(lessonUid)
  const topicById = new Map(topics.map((topic) => [topic.id, topic]))
  const seen = new Set<string>()

  return candidates.reduce<GeneratedPracticeProblem[]>((problems, candidate) => {
    if (!isValidCandidate(candidate)) return problems
    const topic = topicById.get(candidate.topicId)
    if (!topic || seen.has(topic.id)) return problems

    seen.add(topic.id)
    problems.push({
      uid: `ai-practice-${lessonUid}-${topic.id}-${stableProblemId(candidate)}`,
      topicId: topic.id,
      topicName: topic.name,
      question: candidate.question.trim(),
      expected: [candidate.answer],
      explanation: candidate.explanation.trim(),
      unit: candidate.unit?.trim() || undefined,
      hint: topic.hint,
    })
    return problems
  }, [])
}
