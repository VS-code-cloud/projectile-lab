import { useUserData } from './useUserData'
import { allLessons } from '../lessons'
import { countCompletedLessons } from '../lib/lessonCompletion'

/** Result of {@link useCompletedLessonsCount}. */
interface CompletedLessonsState {
  /** Number of fully completed lessons, or null before loaded. */
  count: number | null
  /** True while the user document is loading. */
  loading: boolean
}

/**
 * Returns how many lessons the user has fully completed, derived from the
 * shared user document (no separate Firestore read).
 */
export function useCompletedLessonsCount(): CompletedLessonsState {
  const { lessons, loading } = useUserData()
  return {
    count: loading ? null : countCompletedLessons(allLessons, lessons),
    loading,
  }
}
