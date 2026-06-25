import { createContext } from 'react'

/**
 * Global motion preference governing all decorative animation in the app.
 * - `full`: all choreography + continuous decorative loops run.
 * - `reduced`: one-shot/essential transitions only; ambient loops are static.
 * - `off`: no decorative motion at all (user-triggered physics still works).
 */
export type MotionPreference = 'full' | 'reduced' | 'off'

export interface MotionPreferenceValue {
  /** The user's chosen preference (or system-derived default). */
  preference: MotionPreference
  /** True only for `full`: continuous decorative loops may run. */
  animationsEnabled: boolean
  /** True for `reduced` or `off`: motion is curtailed. */
  reduced: boolean
  setPreference: (pref: MotionPreference) => void
}

export const MOTION_STORAGE_KEY = 'pl:motion-preference'

export const MotionContext = createContext<MotionPreferenceValue>({
  preference: 'full',
  animationsEnabled: true,
  reduced: false,
  setPreference: () => {},
})
