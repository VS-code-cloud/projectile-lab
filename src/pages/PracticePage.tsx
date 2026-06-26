import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { ImmersiveBackground } from '../components/visual/ImmersiveBackground'
import { AnswerFeedback } from '../components/AnswerFeedback'
import { getLesson } from '../lessons'
import { useLessonProgress } from '../hooks/useLessonProgress'
import { canAccessRetrievalPractice } from '../lib/lessonCompletion'
import { getLessonPath } from '../lib/lessonRoutes'
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
  return value === problem.expected[0]
}

/** Post-lesson retrieval practice page generated with Firebase AI Logic. */
export default function PracticePage() {
  const { lessonUid = '' } = useParams()
  const lesson = getLesson(lessonUid)
  const { progress, loading, recordAnswer } = useLessonProgress(lessonUid)
  const theme = getLessonTheme(lessonUid)
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

  if (loading || practiceLoading) {
    return (
      <ImmersiveBackground>
        <Header />
        <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
          <div className="card h-64 animate-shimmer" />
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
