import type { LessonProgress } from '../firebase/firestore'
import type { Lesson } from '../lessons/types'

/**
 * True when every step in the lesson has been finished.
 * @param lesson The lesson definition.
 * @param progress Saved progress for that lesson, if any.
 */
export function isLessonComplete(
  lesson: Lesson,
  progress: LessonProgress | undefined,
): boolean {
  if (!progress || lesson.steps.length === 0) return false
  return progress.numStepsCompleted >= lesson.steps.length
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
