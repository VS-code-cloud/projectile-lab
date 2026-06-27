import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  emptyLessonProgress,
  getUserDoc,
  saveLessonProgress,
  saveStreak,
} from '../firebase/firestore'
import type { LessonProgress, UserDoc } from '../firebase/firestore'
import { localDayDifference } from '../lib/date'
import { UserDataContext } from './userDataContext'

interface ResolvedStreak {
  streak: number
  lastTimeActive: number
  changed: boolean
}

/**
 * Applies the daily-streak rules (local timezone) with guards for missing or
 * corrupt data: same day = unchanged, next day = +1, gap = reset to 1, and a
 * non-finite `lastTimeActive` re-anchors to today instead of producing NaN.
 */
function resolveStreak(doc: UserDoc, now: number): ResolvedStreak {
  const currentStreak = Number.isFinite(doc.currentStreak) ? doc.currentStreak : 1
  if (!Number.isFinite(doc.lastTimeActive)) {
    return { streak: currentStreak, lastTimeActive: now, changed: true }
  }
  const diff = localDayDifference(doc.lastTimeActive, now)
  let streak = currentStreak
  if (diff === 1) streak = currentStreak + 1
  else if (diff > 1) streak = 1
  return {
    streak,
    lastTimeActive: diff === 0 ? doc.lastTimeActive : now,
    changed: diff !== 0,
  }
}

/**
 * Loads the signed-in user's Firestore document exactly once and shares lesson
 * progress and streak across the app, replacing the per-hook fetches that
 * previously caused N+1 reads. All mutations go through a single in-memory map,
 * eliminating the load/save race where a slow fetch could clobber local writes.
 */
export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [lessons, setLessons] = useState<Record<string, LessonProgress>>({})
  const [streak, setStreak] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Authoritative in-memory lessons map, mutated synchronously so a write is
  // never lost to a re-render or an in-flight fetch.
  const lessonsRef = useRef<Record<string, LessonProgress>>({})
  // Writes made before the initial fetch resolves; overlaid on the server data
  // so a slow load cannot overwrite newer local progress.
  const pendingRef = useRef<Record<string, LessonProgress>>({})
  // Increments on every user change so a stale fetch can detect it lost the race.
  const loadIdRef = useRef(0)
  const uidRef = useRef<string | null>(null)
  const loadingRef = useRef(true)

  useEffect(() => {
    const loadId = ++loadIdRef.current
    uidRef.current = user?.uid ?? null
    lessonsRef.current = {}
    pendingRef.current = {}
    loadingRef.current = true

    let active = true
    void (async () => {
      // Reset to a clean slate so a previous user's data never lingers.
      setLessons({})
      setStreak(null)
      setLoading(true)

      if (!user) {
        loadingRef.current = false
        setLoading(false)
        return
      }

      const data = await getUserDoc(user.uid)
      if (!active || loadId !== loadIdRef.current) return

      const merged = { ...(data?.lessons ?? {}), ...pendingRef.current }
      pendingRef.current = {}
      lessonsRef.current = merged
      setLessons(merged)

      if (data) {
        const now = Date.now()
        const resolved = resolveStreak(data, now)
        setStreak(resolved.streak)
        if (resolved.changed) {
          saveStreak(user.uid, resolved.streak, resolved.lastTimeActive).catch(
            (error) => console.error('Failed to persist streak', error),
          )
        }
      } else {
        setStreak(null)
      }

      loadingRef.current = false
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [user])

  const updateLessonProgress = useCallback(
    (lessonUid: string, updater: (prev: LessonProgress) => LessonProgress) => {
      const prev = lessonsRef.current[lessonUid] ?? emptyLessonProgress()
      const next = updater(prev)
      if (next === prev) return

      const nextLessons = { ...lessonsRef.current, [lessonUid]: next }
      lessonsRef.current = nextLessons
      setLessons(nextLessons)

      // Preserve this write if the initial load is still in flight.
      if (loadingRef.current) pendingRef.current[lessonUid] = next

      const uid = uidRef.current
      if (uid) {
        saveLessonProgress(uid, lessonUid, next).catch((error) =>
          console.error('Failed to save lesson progress', error),
        )
      }
    },
    [],
  )

  return (
    <UserDataContext.Provider
      value={{ loading, lessons, streak, updateLessonProgress }}
    >
      {children}
    </UserDataContext.Provider>
  )
}
