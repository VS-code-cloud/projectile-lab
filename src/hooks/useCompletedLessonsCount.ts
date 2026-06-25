import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getUserDoc } from '../firebase/firestore'
import { allLessons } from '../lessons'
import { countCompletedLessons } from '../lib/lessonCompletion'

/** Result of {@link useCompletedLessonsCount}. */
interface CompletedLessonsState {
  /** Number of fully completed lessons, or null before loaded. */
  count: number | null
  /** True while progress is being read from Firestore. */
  loading: boolean
}

/**
 * Loads the user's saved progress and returns how many lessons they have
 * finished (all steps completed).
 */
export function useCompletedLessonsCount(): CompletedLessonsState {
  const { user } = useAuth()
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      if (!user) {
        if (active) {
          setCount(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      const data = await getUserDoc(user.uid)
      if (!active) return
      setCount(countCompletedLessons(allLessons, data?.lessons))
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [user])

  return { count, loading }
}
