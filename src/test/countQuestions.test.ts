import { describe, it, expect } from 'vitest'
import { countQuestions } from '../lessons/types'
import type { Lesson, Step, StepType } from '../lessons/types'

/** Builds a step of the given type for counting tests. */
function makeStep(uid: string, stepType: StepType): Step {
  return {
    uid,
    stepType,
    displayText: '',
    interactiveComponent: 'IntroDemo',
    expected: [0],
    explanation: '',
  }
}

/** Wraps steps into a minimal lesson. */
function makeLesson(steps: Step[]): Lesson {
  return { uid: 'l1', displayName: 'Test', text: '', steps }
}

describe('countQuestions', () => {
  it('counts only steps with stepType "question"', () => {
    const lesson = makeLesson([
      makeStep('a', 'demo'),
      makeStep('b', 'question'),
      makeStep('c', 'demo'),
      makeStep('d', 'question'),
      makeStep('e', 'question'),
    ])
    expect(countQuestions(lesson)).toBe(3)
  })

  it('returns 0 when there are no question steps', () => {
    const lesson = makeLesson([makeStep('a', 'demo'), makeStep('b', 'demo')])
    expect(countQuestions(lesson)).toBe(0)
  })

  it('returns 0 for an empty lesson', () => {
    expect(countQuestions(makeLesson([]))).toBe(0)
  })
})
