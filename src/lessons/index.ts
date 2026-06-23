import type { Lesson } from './types'
import projectile2d from './projectile-2d.json'

/** All lessons available in the app, keyed by lesson uid. */
const lessons: Record<string, Lesson> = {
  [projectile2d.uid]: projectile2d as Lesson,
}

/** Ordered list of all lessons (used by the home page). */
export const allLessons: Lesson[] = Object.values(lessons)

/**
 * Looks up a lesson by its uid.
 * @param uid Lesson identifier.
 * @returns The matching lesson, or undefined if not found.
 */
export function getLesson(uid: string): Lesson | undefined {
  return lessons[uid]
}
