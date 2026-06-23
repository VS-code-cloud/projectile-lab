import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getUserDoc, saveStreak } from '../firebase/firestore'
import { localDayDifference } from '../lib/date'

/** Result of the streak hook. */
interface StreakState {
  /** Current streak value, or null before it has loaded. */
  streak: number | null
  /** True while the streak is being computed/persisted. */
  loading: boolean
}

/**
 * Resolves and updates the user's daily streak on app open.
 *
 * Streak rules (local timezone):
 * - Same local day as last activity: unchanged.
 * - Exactly one calendar day later: incremented.
 * - More than one day later: reset to 1.
 * New users already start at 1 via {@link ensureUserDoc}.
 *
 * The computation is idempotent: once an update writes `lastTimeActive` to
 * "today", subsequent runs (e.g. route changes) see a zero-day difference and
 * make no further changes.
 *
 * @returns The current streak and a loading flag.
 */
export function useStreak(): StreakState {
  const { user } = useAuth()
  const [streak, setStreak] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      if (!user) {
        if (active) {
          setStreak(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      const data = await getUserDoc(user.uid)
      if (!active || !data) {
        setLoading(false)
        return
      }

      const now = Date.now()
      const diff = localDayDifference(data.lastTimeActive, now)
      let nextStreak = data.currentStreak

      if (diff === 1) {
        nextStreak = data.currentStreak + 1
      } else if (diff > 1) {
        nextStreak = 1
      }

      if (diff !== 0) {
        try {
          await saveStreak(user.uid, nextStreak, now)
        } catch (error) {
          console.error('Failed to persist streak', error)
        }
      }

      if (!active) return
      setStreak(nextStreak)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [user])

  return { streak, loading }
}
