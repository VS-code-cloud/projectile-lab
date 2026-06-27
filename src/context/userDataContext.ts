import { createContext } from 'react'
import type { LessonProgress } from '../firebase/firestore'

/** Value exposed by the shared user-data context (single Firestore user doc). */
export interface UserDataContextValue {
  /** True until the user document has been read once for the current user. */
  loading: boolean
  /** Map of lessonUid -> progress for the signed-in user. */
  lessons: Record<string, LessonProgress>
  /** Current daily streak, or null when logged out / not yet loaded. */
  streak: number | null
  /**
   * Applies a pure update to one lesson's progress, updating the in-memory map
   * and persisting to Firestore. A no-op when the updater returns its input.
   */
  updateLessonProgress: (
    lessonUid: string,
    updater: (prev: LessonProgress) => LessonProgress,
  ) => void
}

export const UserDataContext = createContext<UserDataContextValue>({
  loading: true,
  lessons: {},
  streak: null,
  updateLessonProgress: () => {},
})
