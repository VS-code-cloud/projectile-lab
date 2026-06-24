import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { MasteryBar } from '../components/MasteryBar'
import { BrandMark } from '../components/BrandMark'
import { LessonGlyph } from '../components/LessonGlyph'
import { getLessonTheme } from '../lib/lessonTheme'
import { allLessons } from '../lessons'
import { countQuestions } from '../lessons/types'
import type { Lesson } from '../lessons/types'
import { useAuth } from '../hooks/useAuth'
import { useLessonProgress } from '../hooks/useLessonProgress'

/** Decorative parabolic trajectory motif used in the logged-out hero. */
function TrajectoryArt() {
  return (
    <svg
      viewBox="0 0 400 130"
      className="mx-auto h-28 w-full max-w-md"
      fill="none"
      aria-hidden="true"
    >
      <line x1="20" y1="112" x2="380" y2="112" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <path
        d="M28 112 C 130 -6, 270 -6, 372 112"
        stroke="#a5b4fc"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="3 6"
      />
      <line x1="28" y1="112" x2="60" y2="78" stroke="#e0e7ff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="28" cy="112" r="4.5" fill="#e0e7ff" />
      <circle cx="200" cy="33" r="6.5" fill="#818cf8" />
      <circle cx="372" cy="112" r="4.5" fill="#5eead4" />
    </svg>
  )
}

/** A single feature highlight in the logged-out hero. */
function HeroFeature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 text-left ring-1 ring-white/10">
      <p className="font-display text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">{body}</p>
    </div>
  )
}

/**
 * A single lesson card showing its accent glyph, title, description, mastery
 * progress, and an action to open the lesson.
 * @param props.lesson The lesson to display.
 * @param props.index Position used to stagger the entrance animation.
 */
function LessonCard({ lesson, index }: { lesson: Lesson; index: number }) {
  const { progress } = useLessonProgress(lesson.uid)
  const totalQuestions = countQuestions(lesson)
  const started = progress.numStepsCompleted > 0
  const theme = getLessonTheme(lesson.uid)

  return (
    <div
      className={`card animate-rise group p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${theme.hoverBorder}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Link to={`/lesson/${lesson.uid}`} className="block">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${theme.tile} transition-transform group-hover:scale-105`}
          >
            <LessonGlyph uid={lesson.uid} size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                {lesson.displayName}
              </h2>
              <span className="chip shrink-0 bg-slate-100 text-slate-500">
                {lesson.steps.length} &middot; {totalQuestions}Q
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {lesson.text}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <MasteryBar
            stepsCompleted={progress.numStepsCompleted}
            totalSteps={lesson.steps.length}
            numCorrect={progress.numCorrect}
            totalQuestions={totalQuestions}
          />
        </div>
      </Link>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <Link to={`/lesson/${lesson.uid}`} className="btn-primary w-full py-2">
          {started ? 'Continue lesson' : 'Start lesson'}
          <span className="transition-transform group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Link>
      </div>
    </div>
  )
}

/**
 * Public home page. Shows a marketing hero when logged out and the lesson list
 * with mastery progress when authenticated (lessons require sign-in).
 */
export default function HomePage() {
  const { user, loading } = useAuth()
  const firstName = user?.displayName?.split(' ')[0]

  return (
    <div className="bg-grid min-h-svh">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
            <div className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
          </div>
        ) : user ? (
          <>
            <div className="animate-fade mb-6">
              <p className="text-sm font-semibold text-indigo-600">
                Welcome back{firstName ? `, ${firstName}` : ''}
              </p>
              <h1 className="font-display mt-0.5 text-3xl font-bold tracking-tight text-slate-900">
                Your physics lessons
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Build intuition for motion and forces, one interactive step at a
                time.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {allLessons.map((lesson, i) => (
                <LessonCard key={lesson.uid} lesson={lesson} index={i} />
              ))}
            </div>
          </>
        ) : (
          <section
            className="animate-rise relative overflow-hidden rounded-3xl px-6 py-12 text-center shadow-xl ring-1 ring-white/10 sm:px-10 sm:py-16"
            style={{
              backgroundImage:
                'linear-gradient(to bottom right, #0f172a, #1e1b4b 55%, #0f172a)',
            }}
          >
            <div className="bg-grid-dark absolute inset-0 opacity-70" aria-hidden="true" />
            <div
              className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative mx-auto max-w-xl">
              <div className="flex justify-center">
                <BrandMark size={56} />
              </div>
              <h1 className="font-display mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                Learn physics by <span className="text-gradient">doing</span>.
              </h1>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-300">
                Fire virtual cannons, decompose vectors, tilt ramps, and predict
                motion through hands-on, physically accurate simulations.
              </p>
              <div className="mt-7">
                <TrajectoryArt />
              </div>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link to="/login" className="btn-primary px-6 py-3 text-base">
                  Log in to start &rarr;
                </Link>
              </div>
              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                <HeroFeature
                  title="Interactive sims"
                  body="Physically accurate Canvas simulations you drive yourself."
                />
                <HeroFeature
                  title="Track mastery"
                  body="Per-lesson mastery bars and a daily learning streak."
                />
                <HeroFeature
                  title="Five topics"
                  body="Projectiles, kinematics, forces, ramps, and circular motion."
                />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
