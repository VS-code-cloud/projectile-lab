import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { MasteryBar } from '../components/MasteryBar'
import { AnswerFeedback } from '../components/AnswerFeedback'
import { InteractiveStep } from '../components/InteractiveStep'
import { allLessons, getLesson } from '../lessons'
import { countQuestions } from '../lessons/types'
import { useLessonProgress } from '../hooks/useLessonProgress'
import { checkAnswer } from '../lib/checkAnswer'

/**
 * Lesson player: walks the learner through each step, renders the referenced
 * interactive component, records progress, and shows answer feedback. After the
 * final step it recommends the next lesson (or notes that more are coming if
 * this is the last lesson).
 */
export default function LessonPage() {
  const { lessonUid = '' } = useParams()
  const lesson = getLesson(lessonUid)
  const { progress, loading, completeStep, recordAnswer } =
    useLessonProgress(lessonUid)

  const [index, setIndex] = useState(0)
  const initialized = useRef(false)

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
        <main className="mx-auto max-w-2xl px-4 py-10 text-center">
          <p className="text-slate-600">Lesson not found.</p>
          <Link to="/" className="mt-3 inline-block font-semibold text-indigo-600">
            Back to lessons
          </Link>
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

  const isQuestion = step.stepType === 'question'
  const lessonOrder = allLessons.findIndex((l) => l.uid === lesson.uid)
  const nextLesson =
    lessonOrder === -1 ? undefined : allLessons[lessonOrder + 1]

  return (
    <div className="bg-grid min-h-svh">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          &larr; Lessons
        </Link>

        <div className="card mt-3 p-4">
          <MasteryBar
            stepsCompleted={progress.numStepsCompleted}
            totalSteps={lesson.steps.length}
            numCorrect={progress.numCorrect}
            totalQuestions={totalQuestions}
          />
          {/* Step indicator: one dot per step, current highlighted. */}
          <div className="mt-3 flex items-center gap-1.5">
            {lesson.steps.map((s, i) => {
              const done = progress.completedStepUids.includes(s.uid)
              const current = i === index
              return (
                <button
                  key={s.uid}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to step ${i + 1}`}
                  aria-current={current ? 'step' : undefined}
                  className={`h-2 flex-1 rounded-full transition ${
                    current
                      ? 'bg-indigo-600'
                      : done
                        ? 'bg-indigo-300'
                        : 'bg-slate-200 hover:bg-slate-300'
                  }`}
                />
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span
            className={`chip ${
              isQuestion
                ? 'bg-violet-50 text-violet-700'
                : 'bg-teal-50 text-teal-700'
            }`}
          >
            {isQuestion ? 'Question' : 'Demonstration'}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Step <span className="num">{index + 1}</span> of{' '}
            <span className="num">{lesson.steps.length}</span>
          </span>
        </div>
        <p className="mt-2 text-base leading-relaxed text-slate-800">
          {step.displayText}
        </p>

        <div className="card mt-4 p-4">
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
          <div className="mt-4 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 text-center">
            <p className="text-lg font-semibold text-indigo-900">
              You finished the lesson!
            </p>
            {nextLesson ? (
              <>
                <p className="mt-1 text-sm text-indigo-700">
                  Up next: <span className="font-semibold">{nextLesson.displayName}</span> &mdash;{' '}
                  {nextLesson.text}
                </p>
                <Link
                  to={`/lesson/${nextLesson.uid}`}
                  className="btn-primary mt-4"
                >
                  Start {nextLesson.displayName} &rarr;
                </Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-indigo-700">
                  More lessons are coming soon &mdash; check back for the next
                  step in your physics journey.
                </p>
                <Link to="/" className="btn-primary mt-4">
                  Back to lessons
                </Link>
              </>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="btn-ghost"
          >
            &larr; Back
          </button>
          <button
            type="button"
            onClick={() =>
              setIndex((i) => Math.min(lesson.steps.length - 1, i + 1))
            }
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
