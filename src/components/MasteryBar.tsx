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
      <div className="flex items-center justify-between text-sm font-medium text-slate-600">
        <span>
          <span className="num">
            {stepsCompleted}/{totalSteps}
          </span>{' '}
          steps
        </span>
        <span>
          <span className="num">{masteryPct}%</span> mastery
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={stepPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Lesson progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500"
          style={{ width: `${stepPct}%` }}
        />
      </div>
    </div>
  )
}
