import { useContext } from 'react'
import { AuthContext } from '../context/authContext'
import type { AuthContextValue } from '../context/authContext'

/**
 * Convenience hook for reading the current authentication state.
 * @returns The current auth context value.
 */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
