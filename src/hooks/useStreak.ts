import { useUserData } from './useUserData'

/** Result of the streak hook. */
interface StreakState {
  /** Current streak value, or null before it has loaded / when logged out. */
  streak: number | null
  /** True while the user document is loading. */
  loading: boolean
}

/**
 * Reads the user's daily streak from the shared user document. The streak is
 * resolved and persisted once per app open in {@link UserDataProvider}; here it
 * is only surfaced (and is null while loading or after a user switch).
 */
export function useStreak(): StreakState {
  const { streak, loading } = useUserData()
  return { streak, loading }
}
