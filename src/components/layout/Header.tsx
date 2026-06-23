import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useStreak } from '../../hooks/useStreak'
import { signOutUser } from '../../firebase/auth'
import { BrandMark } from '../BrandMark'

/**
 * Compact streak badge shown in the header. Uses an inline spark icon rather
 * than an emoji for a more polished, professional look.
 * @param props.streak The current streak count.
 */
function StreakBadge({ streak }: { streak: number }) {
  return (
    <div
      className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-200/70"
      title={`${streak}-day streak`}
      aria-label={`${streak}-day streak`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13 2 L4 14 h6 l-1 8 9-12 h-6 z" />
      </svg>
      <span className="num">{streak}</span>
    </div>
  )
}

/**
 * Top application bar. Shows the brand mark, a streak counter (top-right) when
 * signed in, a Login link when logged out, and a Sign out button when logged in.
 */
export function Header() {
  const { user } = useAuth()
  const { streak } = useStreak()
  const navigate = useNavigate()

  /** Signs the user out and returns them to the home page. */
  async function handleSignOut() {
    await signOutUser()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark size={28} />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Projectile<span className="text-indigo-600">Lab</span>
          </span>
        </Link>

        <div className="flex items-center gap-2.5">
          {user && streak !== null && <StreakBadge streak={streak} />}

          {user ? (
            <button type="button" onClick={handleSignOut} className="btn-ghost py-1.5">
              Sign out
            </button>
          ) : (
            <Link to="/login" className="btn-primary py-1.5">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
