import type { LessonProgress } from '../firebase/firestore'
import type { Lesson } from '../lessons/types'
import { getLessonFlow } from '../lessons/types'

/**
 * True when every step in the lesson has been finished.
 * @param lesson The lesson definition.
 * @param progress Saved progress for that lesson, if any.
 */
export function isLessonComplete(
  lesson: Lesson,
  progress: LessonProgress | undefined,
): boolean {
  const lessonSteps = getLessonFlow(lesson)
  if (!progress || lessonSteps.length === 0) return false
  return lessonSteps.every((step) =>
    progress.completedStepUids.includes(step.uid),
  )
}

/**
 * True when optional retrieval practice should be available for a lesson.
 * Practice is only available after the required lesson sequence is complete.
 * @param lesson The lesson definition.
 * @param progress Saved progress for that lesson, if any.
 */
export function canAccessRetrievalPractice(
  lesson: Lesson,
  progress: LessonProgress | undefined,
): boolean {
  return isLessonComplete(lesson, progress)
}

/**
 * True when a lesson is unlocked in the linear course sequence.
 * The first lesson has no prerequisite; every later lesson requires the
 * immediately previous lesson to be complete.
 * @param previousLesson The lesson immediately before the current lesson.
 * @param previousProgress Saved progress for the previous lesson, if any.
 */
export function canAccessLesson(
  previousLesson: Lesson | undefined,
  previousProgress: LessonProgress | undefined,
): boolean {
  return !previousLesson || isLessonComplete(previousLesson, previousProgress)
}

/**
 * Counts how many lessons in the catalog the user has fully completed.
 * @param lessons All lessons to check.
 * @param progressByLesson Map of lesson uid → progress from the user doc.
 */
export function countCompletedLessons(
  lessons: Lesson[],
  progressByLesson: Record<string, LessonProgress> | undefined,
): number {
  if (!progressByLesson) return 0
  return lessons.reduce(
    (count, lesson) =>
      count + (isLessonComplete(lesson, progressByLesson[lesson.uid]) ? 1 : 0),
    0,
  )
}
