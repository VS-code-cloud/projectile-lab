import { describe, expect, it } from 'vitest'
import {
  PRACTICE_ATTEMPT_LIMIT,
  normalizeGeneratedPracticeProblems,
} from '../lib/generatedPractice'
import { getPracticeTopics } from '../lib/practiceTopics'

describe('normalizeGeneratedPracticeProblems', () => {
  it('matches generated questions to lesson topics and hardcoded hints', () => {
    const topic = getPracticeTopics('kinematics-1d')[0]
    const problems = normalizeGeneratedPracticeProblems('kinematics-1d', [
      {
        topicId: topic.id,
        question:
          'A cart starts at 2 m/s and accelerates at 3 m/s^2 for 4 s. What is its final velocity?',
        answer: 14,
        explanation: 'Use v = v0 + at = 2 + 3*4 = 14 m/s.',
        unit: 'm/s',
      },
    ])

    expect(problems).toEqual([
      {
        uid: expect.stringMatching(/^ai-practice-kinematics-1d-/),
        topicId: topic.id,
        topicName: topic.name,
        question:
          'A cart starts at 2 m/s and accelerates at 3 m/s^2 for 4 s. What is its final velocity?',
        expected: [14],
        explanation: 'Use v = v0 + at = 2 + 3*4 = 14 m/s.',
        unit: 'm/s',
        hint: topic.hint,
      },
    ])
  })

  it('drops invalid generated problems and keeps one per known topic', () => {
    const [topic] = getPracticeTopics('newtons-second-law')
    const problems = normalizeGeneratedPracticeProblems('newtons-second-law', [
      { topicId: 'unknown', question: 'Nope', answer: 1, explanation: 'No.' },
      { topicId: topic.id, question: '', answer: 1, explanation: 'No.' },
      { topicId: topic.id, question: 'Bad', answer: Number.NaN, explanation: 'No.' },
      {
        topicId: topic.id,
        question: 'A 12 N net force acts on a 3 kg cart. Find acceleration.',
        answer: 4,
        explanation: 'Use a = F/m = 12/3 = 4 m/s^2.',
        unit: 'm/s^2',
      },
      {
        topicId: topic.id,
        question: 'Duplicate topic should be ignored.',
        answer: 2,
        explanation: 'No.',
      },
    ])

    expect(problems).toHaveLength(1)
    expect(problems[0].question).toBe(
      'A 12 N net force acts on a 3 kg cart. Find acceleration.',
    )
  })

  it('limits practice attempts to three tries', () => {
    expect(PRACTICE_ATTEMPT_LIMIT).toBe(3)
  })
})
