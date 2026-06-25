import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useStreak } from '../../hooks/useStreak'
import { useMotionPreference } from '../../hooks/useMotionPreference'
import type { MotionPreference } from '../../context/motionContext'
import { signOutUser } from '../../firebase/auth'
import { BrandMark } from '../BrandMark'

const MOTION_OPTIONS: { value: MotionPreference; label: string; hint: string }[] = [
  { value: 'full', label: 'Full', hint: 'All motion & effects' },
  { value: 'reduced', label: 'Reduced', hint: 'Essential transitions only' },
  { value: 'off', label: 'Off', hint: 'No decorative motion' },
]

/**
 * Header control to switch the global motion preference (Full / Reduced / Off).
 * Renders an icon button that opens a small popover menu; the choice is
 * persisted and gates both Framer choreography and decorative canvas loops.
 */
function MotionControl() {
  const { preference, setPreference } = useMotionPreference()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost min-h-11 min-w-11 p-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Motion: ${preference}. Change motion preference`}
        title="Motion preference"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 12h4l2-7 4 14 2-7h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Motion preference"
          className="card absolute right-0 z-30 mt-2 w-56 overflow-hidden p-1.5"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Motion
          </p>
          {MOTION_OPTIONS.map((option) => {
            const active = option.value === preference
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setPreference(option.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-slate-50 ${
                  active ? 'text-brand-700' : 'text-slate-700'
                }`}
              >
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="block text-xs text-slate-400">{option.hint}</span>
                </span>
                {active && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0 text-brand-600"
                  >
                    <path
                      d="m5 13 4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
    <header
      className="glass sticky top-0 z-20 border-b border-white/40"
      style={{ background: '#ffffff' }}
    >
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
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

          <MotionControl />

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
