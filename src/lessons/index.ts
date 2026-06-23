import type { Lesson } from './types'
import projectile2d from './projectile-2d.json'
import kinematics1d from './kinematics-1d.json'
import newtonsSecondLaw from './newtons-second-law.json'
import inclinedPlanes from './inclined-planes.json'
import uniformCircularMotion from './uniform-circular-motion.json'

/**
 * Ordered list of all lessons (used by the home page). The array order is the
 * order shown to learners.
 */
export const allLessons: Lesson[] = [
  projectile2d as unknown as Lesson,
  kinematics1d as unknown as Lesson,
  newtonsSecondLaw as unknown as Lesson,
  inclinedPlanes as unknown as Lesson,
  uniformCircularMotion as unknown as Lesson,
]

/** All lessons keyed by lesson uid. */
const lessons: Record<string, Lesson> = Object.fromEntries(
  allLessons.map((lesson) => [lesson.uid, lesson]),
)

/**
 * Looks up a lesson by its uid.
 * @param uid Lesson identifier.
 * @returns The matching lesson, or undefined if not found.
 */
export function getLesson(uid: string): Lesson | undefined {
  return lessons[uid]
}
