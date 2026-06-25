import { useContext } from 'react'
import { MotionContext } from '../context/motionContext'
import type { MotionPreferenceValue } from '../context/motionContext'

/**
 * Convenience hook for reading and updating the global motion preference.
 * @returns The current motion preference context value.
 */
export function useMotionPreference(): MotionPreferenceValue {
  return useContext(MotionContext)
}
