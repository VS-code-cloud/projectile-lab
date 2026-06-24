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
    <header className="glass sticky top-0 z-20 border-b border-white/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <Link
          to="/"
          className="group flex min-h-11 items-center gap-2.5"
          aria-label="ProjectileLab home"
        >
          <BrandMark
            size={32}
            className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
          />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">
            Projectile<span className="text-gradient">Lab</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {user && streak !== null && <StreakBadge streak={streak} />}

          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-ghost min-h-11 py-1.5"
            >
              Sign out
            </button>
          ) : (
            <Link to="/login" className="btn-primary min-h-11 py-1.5">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
