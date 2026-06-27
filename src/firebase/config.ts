import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

/**
 * Firebase web configuration sourced from Vite environment variables.
 * All values are client-side public config; see `.env` for placeholders.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Vite inlines these at BUILD time. If a build runs without them (e.g. a Vercel
// build with no env vars set), every value is undefined and Firebase fails with
// a cryptic "auth/invalid-api-key". Surface the real cause instead.
const ENV_VAR_NAMES: Record<keyof typeof firebaseConfig, string> = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
}
const missingEnv = (
  Object.keys(ENV_VAR_NAMES) as (keyof typeof firebaseConfig)[]
)
  .filter((key) => !firebaseConfig[key])
  .map((key) => ENV_VAR_NAMES[key])
if (missingEnv.length > 0) {
  throw new Error(
    `Missing required Firebase env vars: ${missingEnv.join(', ')}. ` +
      'Add them to .env for local dev and to your Vercel project Environment ' +
      'Variables (Production + Preview), then rebuild/redeploy.',
  )
}

const app = initializeApp(firebaseConfig)

/** Shared Firebase Auth instance. */
export const auth = getAuth(app)

/** Shared Firestore database instance. */
export const db = getFirestore(app)

/** Google sign-in provider used by the login flow. */
export const googleProvider = new GoogleAuthProvider()
