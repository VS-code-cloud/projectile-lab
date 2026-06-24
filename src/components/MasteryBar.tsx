/** Props for {@link MasteryBar}. */
interface MasteryBarProps {
  /** Number of steps whose required interaction has been finished. */
  stepsCompleted: number
  /** Total number of steps in the lesson. */
  totalSteps: number
  /** Number of question steps answered correctly. */
  numCorrect: number
  /** Total number of question steps in the lesson. */
  totalQuestions: number
}

/**
 * Visualizes lesson progress and mastery. The filled bar tracks step
 * completion: `(stepsCompleted / totalSteps) * 100` (demos included). The
 * mastery number is based solely on question steps:
 * `(numCorrect / totalQuestions) * 100`.
 */
export function MasteryBar({
  stepsCompleted,
  totalSteps,
  numCorrect,
  totalQuestions,
}: MasteryBarProps) {
  const stepPct =
    totalSteps > 0 ? Math.round((stepsCompleted / totalSteps) * 100) : 0
  const masteryPct =
    totalQuestions > 0 ? Math.round((numCorrect / totalQuestions) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-slate-600">
          <span className="num font-semibold text-slate-900">
            {stepsCompleted}/{totalSteps}
          </span>{' '}
          steps
        </span>
        <span className="font-medium text-slate-600">
          <span className="num font-semibold text-brand-600">{masteryPct}%</span>{' '}
          mastery
        </span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-inner"
        role="progressbar"
        aria-valuenow={stepPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Lesson progress"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${stepPct}%`,
            backgroundImage:
              'linear-gradient(to right, #4f46e5 0%, #7c3aed 60%, #14b8a6 130%)',
          }}
        />
      </div>
    </div>
  )
}
