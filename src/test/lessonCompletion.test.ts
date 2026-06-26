import { describe, expect, it } from 'vitest'
import type { Lesson, Step } from '../lessons/types'
import type { LessonProgress } from '../firebase/firestore'
import { emptyLessonProgress } from '../firebase/firestore'
import {
  canAccessLesson,
  canAccessRetrievalPractice,
  isLessonComplete,
} from '../lib/lessonCompletion'

/** Builds a minimal lesson step for completion tests. */
function makeStep(uid: string): Step {
  return {
    uid,
    stepType: 'demo',
    displayText: '',
    interactiveComponent: 'IntroDemo',
    expected: [0],
    explanation: '',
  }
}

/** Builds progress with the provided completed step IDs. */
function makeProgress(completedStepUids: string[]): LessonProgress {
  return {
    ...emptyLessonProgress(),
    numStepsCompleted: completedStepUids.length,
    completedStepUids,
  }
}

describe('isLessonComplete', () => {
  it('requires pretrieval and core lesson steps but ignores retrieval practice', () => {
    const lesson: Lesson = {
      uid: 'test',
      displayName: 'Test Lesson',
      text: '',
      pretrieval: [makeStep('pre')],
      steps: [makeStep('core-a'), makeStep('core-b')],
      retrieval: [makeStep('practice')],
    }

    expect(
      isLessonComplete(lesson, makeProgress(['pre', 'core-a', 'core-b'])),
    ).toBe(true)
  })

  it('does not complete when a required lesson step is missing', () => {
    const lesson: Lesson = {
      uid: 'test',
      displayName: 'Test Lesson',
      text: '',
      pretrieval: [makeStep('pre')],
      steps: [makeStep('core')],
      retrieval: [makeStep('practice')],
    }

    expect(isLessonComplete(lesson, makeProgress(['pre', 'practice']))).toBe(
      false,
    )
  })
})

describe('canAccessRetrievalPractice', () => {
  it('allows practice when the required lesson is complete', () => {
    const lesson: Lesson = {
      uid: 'test',
      displayName: 'Test Lesson',
      text: '',
      pretrieval: [makeStep('pre')],
      steps: [makeStep('core')],
      retrieval: [makeStep('practice')],
    }

    expect(canAccessRetrievalPractice(lesson, makeProgress(['pre', 'core']))).toBe(
      true,
    )
  })

  it('does not allow practice before required lesson steps are complete', () => {
    const lesson: Lesson = {
      uid: 'test',
      displayName: 'Test Lesson',
      text: '',
      pretrieval: [makeStep('pre')],
      steps: [makeStep('core')],
      retrieval: [makeStep('practice')],
    }

    expect(canAccessRetrievalPractice(lesson, makeProgress(['pre']))).toBe(false)
  })

  it('allows practice for a completed lesson without authored practice steps', () => {
    const lesson: Lesson = {
      uid: 'test',
      displayName: 'Test Lesson',
      text: '',
      steps: [makeStep('core')],
    }

    expect(canAccessRetrievalPractice(lesson, makeProgress(['core']))).toBe(true)
  })
})

describe('canAccessLesson', () => {
  it('always allows the first lesson in the sequence', () => {
    const current: Lesson = {
      uid: 'current',
      displayName: 'Current Lesson',
      text: '',
      steps: [makeStep('current-core')],
    }

    expect(canAccessLesson(undefined, undefined)).toBe(true)
    expect(canAccessLesson(undefined, makeProgress([]))).toBe(true)
    expect(canAccessLesson(current, makeProgress([]))).toBe(false)
  })

  it('allows a later lesson only when the previous lesson is complete', () => {
    const previous: Lesson = {
      uid: 'previous',
      displayName: 'Previous Lesson',
      text: '',
      pretrieval: [makeStep('pre')],
      steps: [makeStep('core')],
    }

    expect(canAccessLesson(previous, makeProgress(['pre']))).toBe(false)
    expect(canAccessLesson(previous, makeProgress(['pre', 'core']))).toBe(true)
  })
})
