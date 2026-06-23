import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../firebase/config'
import { ensureUserDoc } from '../firebase/firestore'
import { AuthContext } from './authContext'

/**
 * Subscribes to Firebase auth state and provides the current user to the app.
 * Ensures a Firestore user document exists whenever a user signs in.
 * @param props.children Subtree that consumes the auth context.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        try {
          await ensureUserDoc(nextUser)
        } catch (error) {
          console.error('Failed to ensure user document', error)
        }
      }
      setUser(nextUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
