import { useCallback, useMemo } from 'react'
import { useUserData } from './useUserData'
import { emptyLessonProgress } from '../firebase/firestore'
import type { LessonProgress } from '../firebase/firestore'

/** Return value of {@link useLessonProgress}. */
interface UseLessonProgressResult {
  /** The current progress for the lesson. */
  progress: LessonProgress
  /** True while the user document is loading from Firestore. */
  loading: boolean
  /**
   * Marks a step's required interaction as finished (used by demo steps).
   * Idempotent: revisiting a completed step does not re-increment counts.
   */
  completeStep: (stepUid: string) => void
  /**
   * Records an interactive response (one per step). Graded responses increment
   * attempts and correct count; neutral pretrieval responses only complete.
   */
  recordAnswer: (
    stepUid: string,
    values: number[],
    correct: boolean | null,
    countsForProgress?: boolean,
  ) => void
  /** Clears all progress for the lesson so it can be played again from scratch. */
  resetLesson: () => void
}

/** Stable fallback so a not-yet-started lesson keeps a constant reference. */
const EMPTY_PROGRESS = emptyLessonProgress()

/**
 * Exposes one lesson's progress from the shared user document, plus mutations
 * that persist through {@link UserDataProvider}. Reads no longer hit Firestore
 * per lesson; the document is fetched once at the provider level.
 * @param lessonUid The lesson being played.
 */
export function useLessonProgress(
  lessonUid: string,
): UseLessonProgressResult {
  const { lessons, loading, updateLessonProgress } = useUserData()
  const progress = useMemo(
    () => lessons[lessonUid] ?? EMPTY_PROGRESS,
    [lessons, lessonUid],
  )

  const completeStep = useCallback(
    (stepUid: string) => {
      updateLessonProgress(lessonUid, (prev) => {
        if (prev.completedStepUids.includes(stepUid)) return prev
        return {
          ...prev,
          completedStepUids: [...prev.completedStepUids, stepUid],
          numStepsCompleted: prev.numStepsCompleted + 1,
        }
      })
    },
    [lessonUid, updateLessonProgress],
  )

  const recordAnswer = useCallback(
    (
      stepUid: string,
      values: number[],
      correct: boolean | null,
      countsForProgress = true,
    ) => {
      updateLessonProgress(lessonUid, (prev) => {
        if (prev.answers[stepUid]) return prev
        const alreadyCompleted = prev.completedStepUids.includes(stepUid)
        const graded = correct !== null && countsForProgress
        return {
          ...prev,
          answers: { ...prev.answers, [stepUid]: { values, correct } },
          numAttempts: prev.numAttempts + (graded ? 1 : 0),
          numCorrect: prev.numCorrect + (graded && correct === true ? 1 : 0),
          completedStepUids:
            !countsForProgress || alreadyCompleted
              ? prev.completedStepUids
              : [...prev.completedStepUids, stepUid],
          numStepsCompleted:
            !countsForProgress || alreadyCompleted
              ? prev.numStepsCompleted
              : prev.numStepsCompleted + 1,
        }
      })
    },
    [lessonUid, updateLessonProgress],
  )

  const resetLesson = useCallback(() => {
    updateLessonProgress(lessonUid, () => emptyLessonProgress())
  }, [lessonUid, updateLessonProgress])

  return { progress, loading, completeStep, recordAnswer, resetLesson }
}
