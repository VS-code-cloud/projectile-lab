import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { ImmersiveBackground } from '../components/visual/ImmersiveBackground'
import { AnswerFeedback } from '../components/AnswerFeedback'
import { getLesson } from '../lessons'
import type { Lesson } from '../lessons/types'
import { useLessonProgress } from '../hooks/useLessonProgress'
import {
  canAccessRetrievalPractice,
  hasCompletedPractice,
} from '../lib/lessonCompletion'
import { getLessonPath } from '../lib/lessonRoutes'
import { matchesExpected } from '../lib/checkAnswer'
import { getLessonTheme } from '../lib/lessonTheme'
import { loadGeneratedPracticeProblems } from '../lib/aiPractice'
import {
  PRACTICE_ATTEMPT_LIMIT,
  type GeneratedPracticeProblem,
} from '../lib/generatedPractice'

interface PracticeAttemptState {
  count: number
  values: number[] | null
  correct: boolean | null
  final: boolean
}

function checkGeneratedAnswer(
  problem: GeneratedPracticeProblem,
  value: number,
): boolean {
  return matchesExpected(problem.expected[0], value)
}

/** Back-to-lessons link shown at the top of every practice view. */
function LessonsBackLink() {
  return (
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
  )
}

/**
 * Bright callout shown when practice is acting as a review gate before the next
 * lesson. Rendered both while questions generate and once they're ready.
 */
function ReviewBanner({
  lesson,
  nextLesson,
  satisfied,
}: {
  lesson: Lesson
  nextLesson: Lesson
  satisfied: boolean
}) {
  return (
    <div className="card mt-3 border border-brand-300 bg-gradient-to-br from-brand-100 to-accent-100 p-4 shadow-md shadow-brand-300/40 sm:p-5">
      <span className="chip bg-white text-brand-700 shadow-sm">
        <span
          className="h-1.5 w-1.5 rounded-full bg-brand-500"
          aria-hidden="true"
        />
        Reviewing old concepts
      </span>
      <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-slate-700">
        {satisfied ? (
          <>
            Nice work&mdash;you&apos;ve reviewed{' '}
            <span className="font-semibold text-slate-900">
              {lesson.displayName}
            </span>
            . You&apos;re ready to start{' '}
            <span className="font-semibold text-slate-900">
              {nextLesson.displayName}
            </span>
            .
          </>
        ) : (
          <>
            Before starting{' '}
            <span className="font-semibold text-slate-900">
              {nextLesson.displayName}
            </span>
            , complete a quick practice problem to refresh{' '}
            <span className="font-semibold text-slate-900">
              {lesson.displayName}
            </span>
            .
          </>
        )}
      </p>
      {satisfied && (
        <Link
          to={getLessonPath(nextLesson.uid)}
          className="btn-primary mt-4 max-w-full whitespace-normal"
        >
          Start {nextLesson.displayName} &rarr;
        </Link>
      )}
    </div>
  )
}

/** Placeholder card shown while AI practice questions are being generated. */
function GeneratingNotice() {
  return (
    <div className="card mt-3 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold text-slate-700">
          Generating questions&hellip;
        </p>
      </div>
      <div className="mt-4 space-y-2" aria-hidden="true">
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  )
}

/** Post-lesson retrieval practice page generated with Firebase AI Logic. */
export default function PracticePage() {
  const { lessonUid = '' } = useParams()
  const [searchParams] = useSearchParams()
  const lesson = getLesson(lessonUid)
  const { progress, loading, recordAnswer } = useLessonProgress(lessonUid)
  const theme = getLessonTheme(lessonUid)
  // Review mode: practice acts as a gate before the lesson named by `next`.
  // Completing one practice problem satisfies the gate and reveals a continue CTA.
  const nextLesson = getLesson(searchParams.get('next') ?? '')
  const isReview = Boolean(nextLesson)
  const reviewSatisfied = isReview && hasCompletedPractice(lessonUid, progress)
  const [index, setIndex] = useState(0)
  const [problems, setProblems] = useState<GeneratedPracticeProblem[]>([])
  const [practiceLoading, setPracticeLoading] = useState(true)
  const [practiceError, setPracticeError] = useState<string | null>(null)
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({})
  const [attempts, setAttempts] = useState<Record<string, PracticeAttemptState>>(
    {},
  )
  // Per-problem hint visibility; hints stay hidden until the learner asks.
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({})

  const problem = problems[index]
  const savedAnswer = problem ? progress.answers[problem.uid] : undefined
  const attempt = problem ? attempts[problem.uid] : undefined
  const answered = Boolean(savedAnswer) || Boolean(attempt?.final)
  const isCorrect = savedAnswer?.correct ?? attempt?.correct ?? null
  const submittedValues = savedAnswer?.values ?? attempt?.values ?? null
  const canPractice = lesson
    ? canAccessRetrievalPractice(lesson, progress)
    : false

  useEffect(() => {
    let ignore = false
    if (!lesson) {
      return () => {
        ignore = true
      }
    }

    loadGeneratedPracticeProblems(lesson)
      .then((nextProblems) => {
        if (ignore) return
        setProblems(nextProblems)
        setPracticeError(null)
      })
      .catch((error: unknown) => {
        if (ignore) return
        setPracticeError(
          error instanceof Error
            ? error.message
            : 'Practice generation failed.',
        )
      })
      .finally(() => {
        if (!ignore) setPracticeLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [lesson])

  /** Regenerates the runtime practice set. */
  function handleRegenerate() {
    if (!lesson) return
    setPracticeLoading(true)
    setPracticeError(null)
    loadGeneratedPracticeProblems(lesson)
      .then((nextProblems) => {
        setIndex(0)
        setProblems(nextProblems)
        setDraftAnswers({})
        setAttempts({})
        setRevealedHints({})
      })
      .catch((error: unknown) => {
        setPracticeError(
          error instanceof Error
            ? error.message
            : 'Practice generation failed.',
        )
      })
      .finally(() => setPracticeLoading(false))
  }

  /** Checks a practice attempt and records only correct or exhausted attempts. */
  function handleSubmit() {
    if (!problem || answered) return

    const value = Number(draftAnswers[problem.uid])
    if (!Number.isFinite(value)) return

    const correct = checkGeneratedAnswer(problem, value)
    const nextCount = (attempt?.count ?? 0) + 1
    const final = correct || nextCount >= PRACTICE_ATTEMPT_LIMIT
    const nextAttempt: PracticeAttemptState = {
      count: nextCount,
      values: [value],
      correct,
      final,
    }

    setAttempts((current) => ({ ...current, [problem.uid]: nextAttempt }))
    if (final) recordAnswer(problem.uid, [value], correct, false)
  }

  if (!lesson) {
    return (
      <ImmersiveBackground>
        <Header />
        <main className="mx-auto max-w-2xl px-3 py-16 text-center sm:px-4">
          <div className="card animate-rise mx-auto max-w-md p-6 sm:p-8">
            <p className="font-display text-lg font-semibold text-slate-900">
              Lesson not found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              We couldn't find the practice set you're looking for.
            </p>
            <Link to="/" className="btn-primary mt-5">
              Back to lessons
            </Link>
          </div>
        </main>
      </ImmersiveBackground>
    )
  }

  const reviewBanner =
    isReview && nextLesson ? (
      <ReviewBanner
        lesson={lesson}
        nextLesson={nextLesson}
        satisfied={reviewSatisfied}
      />
    ) : null

  if (loading || practiceLoading) {
    return (
      <ImmersiveBackground>
        <Header />
        <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
          <LessonsBackLink />
          {/* Progress is known once lesson data has loaded; show the review
              callout next to the generating notice while questions stream in. */}
          {!loading && reviewBanner}
          <GeneratingNotice />
        </main>
      </ImmersiveBackground>
    )
  }

  if (!canPractice) {
    return (
      <ImmersiveBackground>
        <Header />
        <main className="mx-auto max-w-2xl px-3 py-16 text-center sm:px-4">
          <div className="card animate-rise mx-auto max-w-md p-6 sm:p-8">
            <p className="font-display text-lg font-semibold text-slate-900">
              Finish the lesson first
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Retrieval practice unlocks after you complete the lesson sequence.
            </p>
            <Link to={getLessonPath(lesson.uid)} className="btn-primary mt-5">
              Continue lesson
            </Link>
          </div>
        </main>
      </ImmersiveBackground>
    )
  }

  if (practiceError || !problem) {
    return (
      <ImmersiveBackground>
        <Header />
        <main className="mx-auto max-w-2xl px-3 py-16 text-center sm:px-4">
          <div className="card animate-rise mx-auto max-w-md p-6 sm:p-8">
            <p className="font-display text-lg font-semibold text-slate-900">
              Practice could not be generated
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {practiceError ??
                'Firebase AI Logic did not return a usable practice set.'}
            </p>
            <button
              type="button"
              onClick={handleRegenerate}
              className="btn-primary mt-5"
            >
              Try again
            </button>
          </div>
        </main>
      </ImmersiveBackground>
    )
  }

  const attemptsUsed = savedAnswer ? PRACTICE_ATTEMPT_LIMIT : (attempt?.count ?? 0)
  const attemptsRemaining = Math.max(0, PRACTICE_ATTEMPT_LIMIT - attemptsUsed)
  const hintShown = revealedHints[problem.uid] ?? false

  return (
    <ImmersiveBackground>
      <Header />
      <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
        <LessonsBackLink />

        {reviewBanner}

        <div className="card relative mt-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="chip bg-brand-50 text-brand-700">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-brand-500"
                  aria-hidden="true"
                />
                AI retrieval practice
              </span>
              <h1 className="font-display mt-3 text-xl font-semibold text-slate-900">
                {lesson.displayName}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Topic: {problem.topicName}
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Problem <span className="num">{index + 1}</span> of{' '}
              <span className="num">{problems.length}</span>
            </span>
          </div>
        </div>

        <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-slate-100 sm:text-lg">
          {problem.question}
        </p>

        <div
          className={`card mt-4 border p-4 sm:p-5 ${theme.accentBorder ?? ''}`}
        >
          <label className="text-sm font-semibold text-slate-700" htmlFor="answer">
            Numeric answer{problem.unit ? ` (${problem.unit})` : ''}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="answer"
              type="number"
              inputMode="decimal"
              disabled={answered}
              value={draftAnswers[problem.uid] ?? ''}
              onChange={(event) =>
                setDraftAnswers((current) => ({
                  ...current,
                  [problem.uid]: event.target.value,
                }))
              }
              className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-100"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={answered || !(draftAnswers[problem.uid] ?? '').trim()}
              className="btn-primary min-h-11"
            >
              Submit
            </button>
          </div>
          {problem.hint && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() =>
                  setRevealedHints((current) => ({
                    ...current,
                    [problem.uid]: !hintShown,
                  }))
                }
                aria-expanded={hintShown}
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
                {hintShown ? 'Hide hint' : 'Show hint'}
              </button>
              {hintShown && (
                <p className="mt-2 max-w-[68ch] rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm leading-relaxed text-amber-900 shadow-sm">
                  {problem.hint}
                </p>
              )}
            </div>
          )}
          <p className="mt-2 text-xs font-medium text-slate-500">
            {answered
              ? 'This problem is complete.'
              : `${attemptsRemaining} ${
                  attemptsRemaining === 1 ? 'try' : 'tries'
                } remaining.`}
          </p>
        </div>

        {attempt && !attempt.final && attempt.correct === false && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            Not quite. Use the hint and try again.
          </div>
        )}

        {answered && (
          <div className="mt-4">
            <AnswerFeedback
              correct={Boolean(isCorrect)}
              explanation={`${problem.explanation} Expected answer: ${problem.expected[0]}${problem.unit ? ` ${problem.unit}` : ''}.`}
            />
          </div>
        )}

        {submittedValues && (
          <p className="mt-2 text-xs font-medium text-slate-300">
            Last submitted answer: <span className="num">{submittedValues[0]}</span>
            {problem.unit ? ` ${problem.unit}` : ''}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={index === 0}
            className="btn-secondary min-h-11"
          >
            &larr; Previous practice
          </button>
          <button
            type="button"
            onClick={() =>
              setIndex((current) => Math.min(problems.length - 1, current + 1))
            }
            disabled={index === problems.length - 1 || !answered}
            className="btn-primary min-h-11"
          >
            Next practice &rarr;
          </button>
        </div>
      </main>
    </ImmersiveBackground>
  )
}
