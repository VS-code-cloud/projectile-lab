import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { MasteryBar } from '../components/MasteryBar'
import { BrandMark } from '../components/BrandMark'
import { LessonGlyph } from '../components/LessonGlyph'
import { ImmersiveBackground } from '../components/visual/ImmersiveBackground'
import { getLessonTheme } from '../lib/lessonTheme'
import { allLessons } from '../lessons'
import { countQuestions } from '../lessons/types'
import type { Lesson } from '../lessons/types'
import { useAuth } from '../hooks/useAuth'
import { useCompletedLessonsCount } from '../hooks/useCompletedLessonsCount'
import { useLessonProgress } from '../hooks/useLessonProgress'

/** Parent variant: staggers the reveal of its motion children. */
const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

/** Child variant: a subtle ease-out rise into place. */
const riseItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 140, damping: 20, mass: 0.6 },
  },
}

/** Decorative parabolic trajectory motif used in the logged-out hero. */
function TrajectoryArt() {
  return (
    <svg
      viewBox="0 0 400 130"
      className="mx-auto h-28 w-full max-w-md lg:mx-0 lg:h-32 lg:max-w-none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="traj-arc" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a5b4fc" />
          <stop offset="0.6" stopColor="#818cf8" />
          <stop offset="1" stopColor="#5eead4" />
        </linearGradient>
      </defs>
      <line x1="20" y1="112" x2="380" y2="112" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      {[80, 140, 200, 260, 320].map((x) => (
        <line
          key={x}
          x1={x}
          y1="108"
          x2={x}
          y2="116"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />
      ))}
      <path
        d="M28 112 C 130 -6, 270 -6, 372 112"
        stroke="url(#traj-arc)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="3 6"
      />
      <line x1="28" y1="112" x2="62" y2="76" stroke="#e0e7ff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="28" cy="112" r="4.5" fill="#e0e7ff" />
      <circle cx="200" cy="33" r="6.5" fill="#818cf8" />
      <circle cx="200" cy="33" r="11" fill="none" stroke="#818cf8" strokeWidth="1" opacity="0.4" />
      <circle cx="372" cy="112" r="4.5" fill="#5eead4" />
    </svg>
  )
}

/** A single feature highlight in the logged-out hero. */
function HeroFeature({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <div className="glass-dark lift rounded-2xl p-5 text-left">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-accent-400 ring-1 ring-white/15">
        {icon}
      </div>
      <p className="font-display text-sm font-semibold text-white">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{body}</p>
    </div>
  )
}

/** Shared SVG attributes for the hero feature icons. */
const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** A compact stat shown in the logged-in dashboard summary strip. */
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="card flex flex-col px-4 py-3">
      <span className="num font-display text-2xl font-bold text-slate-900">{value}</span>
      <span className="mt-0.5 text-xs font-medium text-slate-500">{label}</span>
    </div>
  )
}

/**
 * A single lesson card showing its accent glyph, title, description, mastery
 * progress, and an action to open the lesson.
 * @param props.lesson The lesson to display.
 */
function LessonCard({ lesson }: { lesson: Lesson }) {
  const { progress } = useLessonProgress(lesson.uid)
  const totalQuestions = countQuestions(lesson)
  const started = progress.numStepsCompleted > 0
  const theme = getLessonTheme(lesson.uid)

  return (
    <motion.div
      variants={riseItem}
      className={`card lift group flex flex-col p-5 ${theme.hoverBorder}`}
    >
      <Link to={`/lesson/${lesson.uid}`} className="block">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${theme.tile} transition-transform duration-300 group-hover:scale-110`}
          >
            <LessonGlyph uid={lesson.uid} size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <h2 className="font-display min-w-0 text-lg font-semibold leading-snug text-slate-900">
                {lesson.displayName}
              </h2>
              <span className={`chip shrink-0 ${theme.chip}`}>
                <span className="num">{lesson.steps.length}</span> steps &middot;{' '}
                <span className="num">{totalQuestions}</span>Q
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
              {lesson.text}
            </p>
          </div>
        </div>
        <div className="mt-5">
          <MasteryBar
            stepsCompleted={progress.numStepsCompleted}
            totalSteps={lesson.steps.length}
            numCorrect={progress.numCorrect}
            totalQuestions={totalQuestions}
          />
        </div>
      </Link>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <Link to={`/lesson/${lesson.uid}`} className="btn-primary w-full py-2.5">
          {started ? 'Continue lesson' : 'Start lesson'}
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Link>
      </div>
    </motion.div>
  )
}

/**
 * Public home page. Shows a marketing hero when logged out and the lesson list
 * with mastery progress when authenticated (lessons require sign-in).
 */
export default function HomePage() {
  const { user, loading } = useAuth()
  const { count: completedLessons, loading: progressLoading } =
    useCompletedLessonsCount()
  const firstName = user?.displayName?.split(' ')[0]
  const dashboardLoading = loading || progressLoading

  return (
    <ImmersiveBackground>
      <Header />
      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4">
        {dashboardLoading ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="h-20 flex-1 animate-shimmer rounded-2xl" />
              <div className="h-16 w-32 shrink-0 animate-shimmer rounded-2xl" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-52 animate-shimmer rounded-2xl" />
              <div className="h-52 animate-shimmer rounded-2xl" />
              <div className="h-52 animate-shimmer rounded-2xl" />
            </div>
          </div>
        ) : user ? (
          <>
            <div className="animate-fade mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-6">
              <div>
                <p className="text-sm font-semibold text-accent-400">
                  Welcome back{firstName ? `, ${firstName}` : ''}
                </p>
                <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white">
                  Your physics lessons
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  Build intuition for motion and forces, one interactive step at a
                  time.
                </p>
              </div>
              <div className="shrink-0">
                <StatCard
                  value={String(completedLessons ?? 0)}
                  label="Lessons completed"
                />
              </div>
            </div>
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {allLessons.map((lesson) => (
                <LessonCard key={lesson.uid} lesson={lesson} />
              ))}
            </motion.div>
          </>
        ) : (
          <section className="relative px-1 py-8 text-center sm:px-6 sm:py-10 lg:text-left">
            <motion.div
              className="relative"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={riseItem} className="flex justify-center lg:justify-start">
                <BrandMark size={60} />
              </motion.div>
              <motion.div
                variants={riseItem}
                className="mt-6 lg:mt-5 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
                    Interactive physics, done right
                  </p>
                  <h1 className="font-display mt-3 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                    Learn physics by <span className="text-gradient">doing</span>.
                  </h1>
                  <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-200 lg:mx-0">
                    Fire virtual cannons, decompose vectors, tilt ramps, and predict
                    motion through hands-on, physically accurate simulations.
                  </p>
                  <div className="mt-6 flex justify-center lg:justify-start">
                    <Link to="/login" className="btn-primary glow-brand px-5 py-3 text-base sm:px-7">
                      Log in to start &rarr;
                    </Link>
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-center lg:mt-0">
                  <TrajectoryArt />
                </div>
              </motion.div>
              <motion.div variants={riseItem} className="mt-8 grid gap-3 sm:grid-cols-3">
                <HeroFeature
                  icon={
                    <svg {...iconProps}>
                      <path d="M3 19 C 8 5, 16 5, 21 19" />
                      <circle cx="3" cy="19" r="1.4" fill="currentColor" stroke="none" />
                      <circle cx="12" cy="8.5" r="1.8" fill="currentColor" stroke="none" />
                    </svg>
                  }
                  title="Interactive sims"
                  body="Physically accurate Canvas simulations you drive yourself."
                />
                <HeroFeature
                  icon={
                    <svg {...iconProps}>
                      <path d="M4 19 V 5" />
                      <path d="M4 19 H 20" />
                      <path d="M8 16 V 12" />
                      <path d="M12 16 V 8" />
                      <path d="M16 16 V 10" />
                    </svg>
                  }
                  title="Track mastery"
                  body="Per-lesson mastery bars and a daily learning streak."
                />
                <HeroFeature
                  icon={
                    <svg {...iconProps}>
                      <circle cx="12" cy="12" r="8" />
                      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
                      <path d="M12 4 v3 M12 17 v3 M4 12 h3 M17 12 h3" />
                    </svg>
                  }
                  title="Five topics"
                  body="Projectiles, kinematics, forces, ramps, and circular motion."
                />
              </motion.div>
            </motion.div>
          </section>
        )}
      </main>
    </ImmersiveBackground>
  )
}
