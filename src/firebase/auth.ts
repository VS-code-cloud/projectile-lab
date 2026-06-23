import { signInWithPopup, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth, googleProvider } from './config'

/**
 * Launches the Google sign-in popup and resolves with the signed-in user.
 * @returns The authenticated Firebase user.
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

/**
 * Signs the current user out of Firebase Auth.
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth)
}
