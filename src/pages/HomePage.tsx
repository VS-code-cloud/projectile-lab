import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { MasteryBar } from '../components/MasteryBar'
import { allLessons } from '../lessons'
import { countQuestions } from '../lessons/types'
import type { Lesson } from '../lessons/types'
import { useAuth } from '../hooks/useAuth'
import { useLessonProgress } from '../hooks/useLessonProgress'

/**
 * Decorative parabolic trajectory used as a subtle physics motif in the hero.
 */
function TrajectoryArt() {
  return (
    <svg
      viewBox="0 0 400 140"
      className="h-32 w-full"
      fill="none"
      aria-hidden="true"
    >
      <line x1="20" y1="120" x2="380" y2="120" stroke="#cbd5e1" strokeWidth="1.5" />
      <path
        d="M28 120 C 130 -10, 270 -10, 372 120"
        stroke="#6366f1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="3 5"
      />
      <line x1="28" y1="120" x2="58" y2="86" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
      <circle cx="28" cy="120" r="4.5" fill="#1e293b" />
      <circle cx="200" cy="36" r="6" fill="#4f46e5" />
      <circle cx="372" cy="120" r="4.5" fill="#0f766e" />
    </svg>
  )
}

/**
 * A single lesson card showing its title, description, and mastery progress.
 * @param props.lesson The lesson to display.
 */
function LessonCard({ lesson }: { lesson: Lesson }) {
  const { progress } = useLessonProgress(lesson.uid)
  const totalQuestions = countQuestions(lesson)
  const started = progress.numStepsCompleted > 0

  return (
    <Link
      to={`/lesson/${lesson.uid}`}
      className="card group block p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="chip mb-2 bg-indigo-50 text-indigo-700">Mechanics</span>
          <h2 className="text-lg font-semibold text-slate-900">
            {lesson.displayName}
          </h2>
        </div>
        <span className="chip bg-slate-100 text-slate-500">
          {lesson.steps.length} steps &middot; {totalQuestions} Q
        </span>
      </div>
      <p className="mt-1.5 text-sm text-slate-500">{lesson.text}</p>
      <div className="mt-4">
        <MasteryBar
          stepsCompleted={progress.numStepsCompleted}
          totalSteps={lesson.steps.length}
          numCorrect={progress.numCorrect}
          totalQuestions={totalQuestions}
        />
      </div>
      <div className="mt-4 flex items-center text-sm font-semibold text-indigo-600">
        {started ? 'Continue lesson' : 'Start lesson'}
        <span className="ml-1 transition-transform group-hover:translate-x-0.5">
          &rarr;
        </span>
      </div>
    </Link>
  )
}

/**
 * Public home page. Shows a sign-in prompt when logged out and the lesson list
 * with mastery progress when authenticated (lessons themselves require sign-in).
 */
export default function HomePage() {
  const { user, loading } = useAuth()

  return (
    <div className="bg-grid min-h-svh">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : user ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Your lessons
            </h1>
            <p className="mt-1 mb-5 text-sm text-slate-500">
              Build intuition for projectile motion, one interactive step at a
              time.
            </p>
            <div className="space-y-4">
              {allLessons.map((lesson) => (
                <LessonCard key={lesson.uid} lesson={lesson} />
              ))}
            </div>
          </>
        ) : (
          <div className="card bg-glow relative overflow-hidden p-8 text-center sm:p-10">
            <div className="mx-auto max-w-md">
              <TrajectoryArt />
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                Master 2D projectile motion
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-slate-500">
                Fire virtual cannons, decompose velocity vectors, and predict
                where the cannonball lands &mdash; learning by doing.
              </p>
              <Link to="/login" className="btn-primary mt-6 px-6 py-3 text-base">
                Log in to start
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
