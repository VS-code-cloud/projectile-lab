import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { MasteryBar } from '../components/MasteryBar'
import { AnswerFeedback } from '../components/AnswerFeedback'
import { InteractiveStep } from '../components/InteractiveStep'
import { allLessons, getLesson } from '../lessons'
import { countQuestions } from '../lessons/types'
import { useLessonProgress } from '../hooks/useLessonProgress'
import { useMotionPreference } from '../hooks/useMotionPreference'
import { checkAnswer } from '../lib/checkAnswer'
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
  const { animationsEnabled } = useMotionPreference()
  const theme = getLessonTheme(lessonUid)

  const [index, setIndex] = useState(0)
  // Paging direction (+1 forward, -1 back) drives the enter/exit transitions.
  const [direction, setDirection] = useState(1)
  const initialized = useRef(false)

  /** Navigates to a step, recording the direction for the paging animation. */
  function goTo(target: number) {
    const max = lesson ? lesson.steps.length - 1 : 0
    const clamped = Math.max(0, Math.min(max, target))
    setDirection(clamped >= index ? 1 : -1)
    setIndex(clamped)
  }

  const totalQuestions = useMemo(
    () => (lesson ? countQuestions(lesson) : 0),
    [lesson],
  )
  const step = lesson?.steps[index]

  // Resume at the first incomplete step once progress has loaded.
  useEffect(() => {
    if (!lesson || loading || initialized.current) return
    initialized.current = true
    const firstIncomplete = lesson.steps.findIndex(
      (s) => !progress.completedStepUids.includes(s.uid),
    )
    setIndex(firstIncomplete === -1 ? lesson.steps.length - 1 : firstIncomplete)
  }, [lesson, loading, progress.completedStepUids])

  // Demonstration steps complete simply by being viewed (once progress loaded).
  useEffect(() => {
    if (loading) return
    if (step && step.stepType === 'demo') {
      completeStep(step.uid)
    }
  }, [step, completeStep, loading])

  if (!lesson || !step) {
    return (
      <div className="bg-grid min-h-svh">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="card animate-rise mx-auto max-w-md p-8">
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
      </div>
    )
  }

  const answer = progress.answers[step.uid]
  const answered = Boolean(answer)
  const isLastStep = index === lesson.steps.length - 1
  const currentCompleted = progress.completedStepUids.includes(step.uid)

  /** Checks and records a question answer, giving instant feedback. */
  function handleSubmit(values: number[]) {
    if (!step) return
    const correct = checkAnswer(step, values)
    recordAnswer(step.uid, values, correct)
  }

  /** Clears progress and returns to the first step to replay the lesson. */
  function handleRestart() {
    resetLesson()
    setDirection(-1)
    setIndex(0)
  }

  const isQuestion = step.stepType === 'question'
  const lessonOrder = allLessons.findIndex((l) => l.uid === lesson.uid)
  const nextLesson =
    lessonOrder === -1 ? undefined : allLessons[lessonOrder + 1]

  return (
    <div className="bg-grid min-h-svh">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
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
            className="bg-halo pointer-events-none absolute -inset-x-6 -top-8 h-32"
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
                stepsCompleted={progress.numStepsCompleted}
                totalSteps={lesson.steps.length}
                numCorrect={progress.numCorrect}
                totalQuestions={totalQuestions}
                accentBar={theme.accentBar}
              />
            </div>
            {/* Step indicator: one dot per step, current highlighted. */}
            <div className="mt-4 flex items-center gap-1.5">
              {lesson.steps.map((s, i) => {
                const done = progress.completedStepUids.includes(s.uid)
                const current = i === index
                return (
                  <button
                    key={s.uid}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to step ${i + 1}`}
                    aria-current={current ? 'step' : undefined}
                    className="group flex h-6 flex-1 items-center justify-center rounded-full transition"
                  >
                    <span
                      className={`h-2 w-full rounded-full transition ${
                        current
                          ? 'bg-brand-600 shadow-[0_0_0_3px_rgba(99,102,241,0.18)]'
                          : done
                            ? 'bg-brand-300 group-hover:bg-brand-500'
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
            <div className="mt-6 flex items-center gap-2.5">
              <span
                className={`chip ${
                  isQuestion
                    ? 'bg-brand-50 text-brand-700'
                    : 'bg-teal-50 text-accent-600'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isQuestion ? 'bg-brand-500' : 'bg-accent-500'
                  }`}
                  aria-hidden="true"
                />
                {isQuestion ? 'Question' : 'Demonstration'}
              </span>
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${theme.accentText ?? 'text-slate-400'}`}
              >
                Step <span className="num">{index + 1}</span> of{' '}
                <span className="num">{lesson.steps.length}</span>
              </span>
            </div>
            <p className="mt-3 max-w-[68ch] text-lg leading-relaxed text-slate-800">
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

            {answered && (
              <div className="mt-4">
                <AnswerFeedback
                  correct={Boolean(answer?.correct)}
                  explanation={step.explanation}
                />
              </div>
            )}

            {isLastStep && currentCompleted && (
              <motion.div
                className="card glow-brand relative mt-4 overflow-hidden p-6 text-center sm:p-8"
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
                  className="btn-primary mt-5"
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

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="btn-secondary"
          >
            &larr; Back
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={isLastStep}
            className="btn-primary"
          >
            Next &rarr;
          </button>
        </div>
      </main>
    </div>
  )
}
