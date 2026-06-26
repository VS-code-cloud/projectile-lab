import { describe, it, expect } from 'vitest'
import { countLessonSteps, countQuestions } from '../lessons/types'
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

  it('skips neutral pretrieval prompts and separate retrieval practice', () => {
    const lesson: Lesson = {
      ...makeLesson([makeStep('lesson-question', 'question')]),
      pretrieval: [makeStep('pre', 'pretrieval')],
      retrieval: [
        makeStep('retrieval-a', 'question'),
        makeStep('retrieval-b', 'question'),
      ],
    }

    expect(countQuestions(lesson)).toBe(1)
  })
})

describe('countLessonSteps', () => {
  it('counts pretrieval and core lesson steps, but not retrieval practice', () => {
    const lesson: Lesson = {
      ...makeLesson([makeStep('core-a', 'demo'), makeStep('core-b', 'question')]),
      pretrieval: [makeStep('pre', 'pretrieval')],
      retrieval: [makeStep('retrieval', 'question')],
    }

    expect(countLessonSteps(lesson)).toBe(3)
  })
})
