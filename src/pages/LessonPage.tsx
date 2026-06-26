import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { ImmersiveBackground } from '../components/visual/ImmersiveBackground'
import { MasteryBar } from '../components/MasteryBar'
import { AnswerFeedback } from '../components/AnswerFeedback'
import { InteractiveStep } from '../components/InteractiveStep'
import { allLessons, getLesson } from '../lessons'
import { countQuestions, getLessonFlow } from '../lessons/types'
import { useLessonProgress } from '../hooks/useLessonProgress'
import { useMotionPreference } from '../hooks/useMotionPreference'
import { checkAnswer } from '../lib/checkAnswer'
import { canAccessLesson } from '../lib/lessonCompletion'
import { getLessonTheme } from '../lib/lessonTheme'

/** Direction-aware variants for the step paging transition. */
const stepVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 28 : -28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -28 : 28, opacity: 0 }),
}

/**
 * Lightweight, self-contained confetti burst: a handful of dots that animate
 * outward from the center and fade. Rendered only when continuous decorative
 * motion is enabled; otherwise the celebration card stays calm and static.
 */
function ConfettiBurst({ colors }: { colors: string[] }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2
        const distance = 70 + (i % 4) * 18
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          color: colors[i % colors.length],
          delay: (i % 5) * 0.03,
        }
      }),
    [colors],
  )

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute h-2 w-2 rounded-full"
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: [0, 1, 0.6], opacity: [1, 1, 0] }}
          transition={{ duration: 1, ease: 'easeOut', delay: p.delay }}
        />
      ))}
    </div>
  )
}

/**
 * Reveal-on-demand hint for a question step. Lives in its own component so it
 * remounts (and resets to collapsed) whenever the parent rerenders it with a
 * new `key`, i.e. when the learner moves to a different step.
 */
function StepHint({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
        {open ? 'Hide hint' : 'Show hint'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="mt-2 max-w-[68ch] rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm leading-relaxed text-amber-900 shadow-sm">
              {hint}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Lesson player: walks the learner through each step, renders the referenced
 * interactive component, records progress, and shows answer feedback. After the
 * final step it recommends the next lesson (or notes that more are coming if
 * this is the last lesson).
 */
export default function LessonPage() {
  const { lessonUid = '' } = useParams()
  const lesson = getLesson(lessonUid)
  const { progress, loading, completeStep, recordAnswer, resetLesson } =
    useLessonProgress(lessonUid)
  const lessonOrder = lesson ? allLessons.findIndex((l) => l.uid === lesson.uid) : -1
  const previousLesson = lessonOrder > 0 ? allLessons[lessonOrder - 1] : undefined
  const { progress: previousProgress, loading: previousLoading } =
    useLessonProgress(previousLesson?.uid ?? lessonUid)
  const lessonAccessible = canAccessLesson(previousLesson, previousProgress)
  const { animationsEnabled } = useMotionPreference()
  const theme = getLessonTheme(lessonUid)

  const [index, setIndex] = useState(0)
  // Paging direction (+1 forward, -1 back) drives the enter/exit transitions.
  const [direction, setDirection] = useState(1)
  const initialized = useRef(false)

  const totalQuestions = useMemo(
    () => (lesson ? countQuestions(lesson) : 0),
    [lesson],
  )
  const lessonSteps = useMemo(
    () => (lesson ? getLessonFlow(lesson) : []),
    [lesson],
  )
  const firstIncompleteIndex = lessonSteps.findIndex(
    (s) => !progress.completedStepUids.includes(s.uid),
  )
  const reachableMaxIndex =
    firstIncompleteIndex === -1 ? lessonSteps.length - 1 : firstIncompleteIndex
  const step = lessonSteps[index]

  /** Navigates to a step, recording the direction for the paging animation. */
  function goTo(target: number) {
    const max = Math.max(0, reachableMaxIndex)
    const clamped = Math.max(0, Math.min(max, target))
    setDirection(clamped >= index ? 1 : -1)
    setIndex(clamped)
  }

  // Resume at the first incomplete step once progress has loaded.
  useEffect(() => {
    if (
      !lesson ||
      !lessonAccessible ||
      loading ||
      initialized.current ||
      lessonSteps.length === 0
    )
      return
    initialized.current = true
    const firstIncomplete = lessonSteps.findIndex(
      (s) => !progress.completedStepUids.includes(s.uid),
    )
    setIndex(firstIncomplete === -1 ? lessonSteps.length - 1 : firstIncomplete)
  }, [lesson, lessonAccessible, lessonSteps, loading, progress.completedStepUids])

  // Demonstration steps complete simply by being viewed (once progress loaded).
  useEffect(() => {
    if (loading || !lessonAccessible) return
    if (step && step.stepType === 'demo') {
      completeStep(step.uid)
    }
  }, [step, completeStep, loading, lessonAccessible])

  if (!lesson || !step) {
    return (
      <ImmersiveBackground>
        <Header />
        <main className="mx-auto max-w-2xl px-3 py-16 text-center sm:px-4">
          <div className="card animate-rise mx-auto max-w-md p-6 sm:p-8">
            <p className="font-display text-lg font-semibold text-slate-900">
              Lesson not found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              We couldn't find the lesson you're looking for.
            </p>
            <Link to="/" className="btn-primary mt-5">
              Back to lessons
            </Link>
          </div>
        </main>
      </ImmersiveBackground>
    )
  }

  if (previousLesson && previousLoading) {
    return (
      <ImmersiveBackground>
        <Header />
        <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
          <div className="card h-64 animate-shimmer" />
        </main>
      </ImmersiveBackground>
    )
  }

  if (!lessonAccessible) {
    return (
      <ImmersiveBackground>
        <Header />
        <main className="mx-auto max-w-2xl px-3 py-16 text-center sm:px-4">
          <div className="card animate-rise mx-auto max-w-md p-6 sm:p-8">
            <p className="font-display text-lg font-semibold text-slate-900">
              Lesson locked
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Complete {previousLesson?.displayName} before starting this lesson.
            </p>
            <Link to="/" className="btn-primary mt-5">
              Back to lessons
            </Link>
          </div>
        </main>
      </ImmersiveBackground>
    )
  }

  const answer = progress.answers[step.uid]
  const answered = Boolean(answer)
  const isLastStep = index === lessonSteps.length - 1
  const currentCompleted = progress.completedStepUids.includes(step.uid)
  const completedLessonSteps = lessonSteps.filter((s) =>
    progress.completedStepUids.includes(s.uid),
  ).length
  const lessonCorrect = lessonSteps.filter(
    (s) =>
      s.stepType === 'question' && progress.answers[s.uid]?.correct === true,
  ).length
  /** Records an interactive response, grading only real question steps. */
  function handleSubmit(values: number[]) {
    if (!step) return
    const correct =
      step.stepType === 'question' ? checkAnswer(step, values) : null
    recordAnswer(step.uid, values, correct)
  }

  /** Clears progress and returns to the first step to replay the lesson. */
  function handleRestart() {
    resetLesson()
    setDirection(-1)
    setIndex(0)
  }

  const isQuestion = step.stepType === 'question'
  const isPretrieval = step.stepType === 'pretrieval'
  const stepKindLabel = isPretrieval
    ? 'Pretrieval'
    : isQuestion
      ? 'Question'
      : 'Demonstration'
  const stepChipClass = isPretrieval
    ? 'bg-amber-50 text-amber-700'
    : isQuestion
      ? 'bg-brand-50 text-brand-700'
      : 'bg-teal-50 text-accent-600'
  const stepDotClass = isPretrieval
    ? 'bg-amber-500'
    : isQuestion
      ? 'bg-brand-500'
      : 'bg-accent-500'
  const nextLesson =
    lessonOrder === -1 ? undefined : allLessons[lessonOrder + 1]

  return (
    <ImmersiveBackground>
      <Header />
      <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 transition hover:text-white"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Lessons
        </Link>

        {/* Progress overview: mastery bar + step dot navigation. */}
        <div className="relative mt-3">
          <div
            className="bg-halo pointer-events-none absolute -inset-x-3 -top-8 h-32 sm:-inset-x-6"
            style={
              { '--halo': theme.halo ?? 'rgba(99, 102, 241, 0.14)' } as CSSProperties
            }
            aria-hidden="true"
          />
          <div className="card relative p-4 sm:p-5">
            <h1 className="font-display text-base font-semibold text-slate-900 sm:text-lg">
              {lesson.displayName}
            </h1>
            <div className="mt-3">
              <MasteryBar
                stepsCompleted={completedLessonSteps}
                totalSteps={lessonSteps.length}
                numCorrect={lessonCorrect}
                totalQuestions={totalQuestions}
                accentBar={theme.accentBar}
              />
            </div>
            {/* Step indicator: one dot per step, current highlighted. */}
            <div className="mt-4 flex items-center gap-1 sm:gap-1.5">
              {lessonSteps.map((s, i) => {
                const done = progress.completedStepUids.includes(s.uid)
                const current = i === index
                const locked = i > reachableMaxIndex
                return (
                  <button
                    key={s.uid}
                    type="button"
                    onClick={() => goTo(i)}
                    disabled={locked}
                    aria-label={`Go to step ${i + 1}`}
                    aria-current={current ? 'step' : undefined}
                    className="group flex h-6 flex-1 items-center justify-center rounded-full transition disabled:cursor-not-allowed"
                  >
                    <span
                      className={`h-2 w-full rounded-full transition ${
                        current
                          ? 'bg-brand-600 shadow-[0_0_0_3px_rgba(99,102,241,0.18)]'
                          : done
                            ? 'bg-brand-300 group-hover:bg-brand-500'
                            : locked
                              ? 'bg-slate-100'
                              : 'bg-slate-200 group-hover:bg-slate-300'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step.uid}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {/* Step header: kind chip + counter. */}
            <div className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className={`chip ${stepChipClass}`}>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${stepDotClass}`}
                  aria-hidden="true"
                />
                {stepKindLabel}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Step <span className="num">{index + 1}</span> of{' '}
                <span className="num">{lessonSteps.length}</span>
              </span>
            </div>
            <p className="mt-3 max-w-[68ch] text-base leading-relaxed text-slate-100 sm:text-lg">
              {step.displayText}
            </p>

            <div
              className={`card mt-4 border p-4 sm:p-5 ${theme.accentBorder ?? ''}`}
            >
              <InteractiveStep
                key={step.uid}
                step={step}
                answered={answered}
                submittedValues={answer?.values ?? null}
                isCorrect={answer?.correct ?? null}
                onSubmit={handleSubmit}
              />
            </div>

            {isQuestion && step.hint && !answered && (
              <StepHint key={step.uid} hint={step.hint} />
            )}

            {answered && isQuestion && (
              <div className="mt-4">
                <AnswerFeedback
                  correct={Boolean(answer?.correct)}
                  explanation={step.explanation}
                />
              </div>
            )}

            {isLastStep && currentCompleted && (
              <motion.div
                className="card glow-brand relative mt-4 overflow-hidden p-5 text-center sm:p-8"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                {animationsEnabled && (
                  <ConfettiBurst colors={theme.confetti ?? ['#6366f1', '#8b5cf6', '#14b8a6']} />
                )}
                <div
                  className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 10px 28px -10px rgba(124, 58, 237, 0.6)',
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="font-display text-xl font-semibold text-slate-900">
              You finished the lesson!
            </p>
            {nextLesson ? (
              <>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  Up next:{' '}
                  <span className="font-semibold text-slate-800">
                    {nextLesson.displayName}
                  </span>{' '}
                  &mdash; {nextLesson.text}
                </p>
                <Link
                  to={`/lesson/${nextLesson.uid}`}
                  className="btn-primary mt-5 max-w-full whitespace-normal"
                >
                  Start {nextLesson.displayName} &rarr;
                </Link>
              </>
            ) : (
              <>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  More lessons are coming soon &mdash; check back for the next
                  step in your physics journey.
                </p>
                <Link to="/" className="btn-primary mt-5">
                  Back to lessons
                </Link>
              </>
            )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="btn-ghost"
                  >
                    &#8634; Restart this lesson
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="btn-secondary min-h-11"
          >
            &larr; Back
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={isLastStep || index >= reachableMaxIndex}
            className="btn-primary min-h-11"
          >
            Next &rarr;
          </button>
        </div>
      </main>
    </ImmersiveBackground>
  )
}
