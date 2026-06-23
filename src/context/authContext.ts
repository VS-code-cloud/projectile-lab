import { createContext } from 'react'
import type { User } from 'firebase/auth'

/** Value exposed by the authentication context. */
export interface AuthContextValue {
  /** The signed-in Firebase user, or null when logged out. */
  user: User | null
  /** True while the initial auth state is being resolved. */
  loading: boolean
}

/** React context carrying the current authentication state. */
export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
})
