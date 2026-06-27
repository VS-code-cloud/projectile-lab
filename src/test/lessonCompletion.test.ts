import { describe, expect, it } from 'vitest'
import type { Lesson, Step } from '../lessons/types'
import type { LessonProgress } from '../firebase/firestore'
import { emptyLessonProgress } from '../firebase/firestore'
import {
  canAccessLesson,
  canAccessRetrievalPractice,
  hasCompletedPractice,
  isLessonComplete,
  needsPreviousPracticeReview,
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

/** Builds progress with the provided answer uids recorded. */
function makeProgressWithAnswers(answerUids: string[]): LessonProgress {
  return {
    ...emptyLessonProgress(),
    answers: Object.fromEntries(
      answerUids.map((uid) => [uid, { values: [1], correct: true }]),
    ),
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

describe('hasCompletedPractice', () => {
  it('is false with no progress or no practice answers', () => {
    expect(hasCompletedPractice('kinematics-1d', undefined)).toBe(false)
    expect(hasCompletedPractice('kinematics-1d', makeProgress(['core']))).toBe(
      false,
    )
  })

  it('detects a recorded AI practice answer for the lesson', () => {
    const progress = makeProgressWithAnswers([
      'ai-practice-kinematics-1d-velocity-abc123',
    ])
    expect(hasCompletedPractice('kinematics-1d', progress)).toBe(true)
  })

  it('ignores authored lesson step answers and other lessons', () => {
    const progress = makeProgressWithAnswers([
      'step-velocity',
      'ai-practice-projectile-2d-range-zzz999',
    ])
    expect(hasCompletedPractice('kinematics-1d', progress)).toBe(false)
  })
})

describe('needsPreviousPracticeReview', () => {
  const previous: Lesson = {
    uid: 'previous',
    displayName: 'Previous Lesson',
    text: '',
    steps: [makeStep('core')],
  }

  it('never requires review for the first lesson', () => {
    expect(needsPreviousPracticeReview(undefined, undefined)).toBe(false)
  })

  it('does not require review until the previous lesson is complete', () => {
    expect(needsPreviousPracticeReview(previous, makeProgress([]))).toBe(false)
  })

  it('requires review when the previous lesson is complete but unpracticed', () => {
    expect(needsPreviousPracticeReview(previous, makeProgress(['core']))).toBe(
      true,
    )
  })

  it('does not require review once previous practice is done', () => {
    const progress: LessonProgress = {
      ...makeProgress(['core']),
      answers: { 'ai-practice-previous-topic-abc': { values: [1], correct: true } },
    }
    expect(needsPreviousPracticeReview(previous, progress)).toBe(false)
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
