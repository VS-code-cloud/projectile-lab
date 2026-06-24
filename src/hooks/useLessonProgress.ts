import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import {
  emptyLessonProgress,
  getUserDoc,
  saveLessonProgress,
} from '../firebase/firestore'
import type { LessonProgress } from '../firebase/firestore'

/** Return value of {@link useLessonProgress}. */
interface UseLessonProgressResult {
  /** The current progress for the lesson. */
  progress: LessonProgress
  /** True while progress is loading from Firestore. */
  loading: boolean
  /**
   * Marks a step's required interaction as finished (used by demo steps).
   * Idempotent: revisiting a completed step does not re-increment counts.
   */
  completeStep: (stepUid: string) => void
  /**
   * Records a question answer (one per step). Increments attempts, correct
   * count, and completes the step.
   */
  recordAnswer: (stepUid: string, values: number[], correct: boolean) => void
  /** Clears all progress for the lesson so it can be played again from scratch. */
  resetLesson: () => void
}

/**
 * Loads and mutates a user's progress for a single lesson, persisting every
 * change to Firestore so progress survives leaving and returning.
 * @param lessonUid The lesson being played.
 */
export function useLessonProgress(
  lessonUid: string,
): UseLessonProgressResult {
  const { user } = useAuth()
  const [progress, setProgress] = useState<LessonProgress>(
    emptyLessonProgress(),
  )
  const [loading, setLoading] = useState(true)
  const progressRef = useRef<LessonProgress>(progress)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    let active = true
    void (async () => {
      if (!user) {
        if (active) {
          setProgress(emptyLessonProgress())
          setLoading(false)
        }
        return
      }
      setLoading(true)
      const data = await getUserDoc(user.uid)
      if (!active) return
      const existing = data?.lessons?.[lessonUid]
      setProgress(
        existing
          ? { ...emptyLessonProgress(), ...existing }
          : emptyLessonProgress(),
      )
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [user, lessonUid])

  /**
   * Applies a pure update to the current progress, stores it, and persists it.
   * @param updater Returns the next progress, or the same reference for no-op.
   */
  const apply = useCallback(
    (updater: (prev: LessonProgress) => LessonProgress) => {
      const prev = progressRef.current
      const next = updater(prev)
      if (next === prev) return
      progressRef.current = next
      setProgress(next)
      if (user) {
        void saveLessonProgress(user.uid, lessonUid, next).catch((error) =>
          console.error('Failed to save lesson progress', error),
        )
      }
    },
    [user, lessonUid],
  )

  const completeStep = useCallback(
    (stepUid: string) => {
      apply((prev) => {
        if (prev.completedStepUids.includes(stepUid)) return prev
        return {
          ...prev,
          completedStepUids: [...prev.completedStepUids, stepUid],
          numStepsCompleted: prev.numStepsCompleted + 1,
        }
      })
    },
    [apply],
  )

  const recordAnswer = useCallback(
    (stepUid: string, values: number[], correct: boolean) => {
      apply((prev) => {
        if (prev.answers[stepUid]) return prev
        const alreadyCompleted = prev.completedStepUids.includes(stepUid)
        return {
          ...prev,
          answers: { ...prev.answers, [stepUid]: { values, correct } },
          numAttempts: prev.numAttempts + 1,
          numCorrect: prev.numCorrect + (correct ? 1 : 0),
          completedStepUids: alreadyCompleted
            ? prev.completedStepUids
            : [...prev.completedStepUids, stepUid],
          numStepsCompleted: alreadyCompleted
            ? prev.numStepsCompleted
            : prev.numStepsCompleted + 1,
        }
      })
    },
    [apply],
  )

  const resetLesson = useCallback(() => {
    apply(() => emptyLessonProgress())
  }, [apply])

  return { progress, loading, completeStep, recordAnswer, resetLesson }
}
