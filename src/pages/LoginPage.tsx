import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { signInWithGoogle } from '../firebase/auth'
import { BrandMark } from '../components/BrandMark'

/** The multi-color Google "G" logo, used inside the sign-in button. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

/**
 * Standalone login page with Google sign-in. Redirects authenticated users back
 * to the home page.
 */
export default function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  /** Runs the Google sign-in popup and returns home on success. */
  async function handleSignIn() {
    setError(null)
    setBusy(true)
    try {
      await signInWithGoogle()
      navigate('/')
    } catch {
      setError('Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-grid flex min-h-svh flex-col items-center justify-center px-4">
      <div className="bg-glow absolute inset-x-0 top-0 h-80" aria-hidden="true" />
      <div className="card relative w-full max-w-sm p-8 text-center">
        <div className="mb-5 flex justify-center">
          <BrandMark size={52} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Projectile<span className="text-indigo-600">Lab</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to explore interactive 2D projectile motion and track your
          mastery.
        </p>
        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
        >
          <GoogleIcon />
          {busy ? 'Signing in...' : 'Continue with Google'}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
      <p className="relative mt-6 text-xs text-slate-400">
        Decompose velocities &middot; apply 1D equations &middot; predict the arc
      </p>
    </div>
  )
}
