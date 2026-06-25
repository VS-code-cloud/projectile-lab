import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { MotionContext, MOTION_STORAGE_KEY } from './motionContext'
import type { MotionPreference, MotionPreferenceValue } from './motionContext'
import { useMotionPreference } from '../hooks/useMotionPreference'

/** Resolves the initial preference from localStorage, falling back to the OS setting. */
function readInitial(): MotionPreference {
  if (typeof window === 'undefined') return 'full'
  try {
    const stored = window.localStorage.getItem(MOTION_STORAGE_KEY)
    if (stored === 'full' || stored === 'reduced' || stored === 'off') return stored
  } catch {
    /* localStorage may be unavailable (private mode); fall through to media query */
  }
  const prefersReduced = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches
  return prefersReduced ? 'reduced' : 'full'
}

/**
 * Provides the global motion preference, persists explicit choices to
 * localStorage, mirrors the value onto `<html data-motion>` for CSS gating, and
 * tracks the OS `prefers-reduced-motion` setting until the user chooses manually.
 * @param props.children Subtree that consumes the motion preference.
 */
export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<MotionPreference>(readInitial)

  useEffect(() => {
    document.documentElement.dataset.motion = preference
  }, [preference])

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const onChange = () => {
      try {
        if (window.localStorage.getItem(MOTION_STORAGE_KEY)) return
      } catch {
        /* ignore */
      }
      setPreferenceState(mq.matches ? 'reduced' : 'full')
    }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const setPreference = useCallback((pref: MotionPreference) => {
    setPreferenceState(pref)
    try {
      window.localStorage.setItem(MOTION_STORAGE_KEY, pref)
    } catch {
      /* ignore persistence failures */
    }
  }, [])

  const value = useMemo<MotionPreferenceValue>(
    () => ({
      preference,
      animationsEnabled: preference === 'full',
      reduced: preference !== 'full',
      setPreference,
    }),
    [preference, setPreference],
  )

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

/**
 * Bridges the app's motion preference into Framer Motion. `full` lets all
 * choreography run; `reduced`/`off` ask Framer to swap transforms for opacity.
 * Must be rendered inside {@link MotionPreferenceProvider}.
 * @param props.children Subtree wrapped by Framer's MotionConfig.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  const { preference } = useMotionPreference()
  return (
    <MotionConfig reducedMotion={preference === 'full' ? 'never' : 'always'}>
      {children}
    </MotionConfig>
  )
}
