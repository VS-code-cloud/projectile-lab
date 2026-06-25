import { motion } from 'framer-motion'
import { useMotionPreference } from '../hooks/useMotionPreference'

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
  /**
   * Optional themed gradient class pair for the progress fill
   * (e.g. 'from-indigo-500 to-violet-500'). Defaults to the brand gradient.
   */
  accentBar?: string
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
  accentBar,
}: MasteryBarProps) {
  const { animationsEnabled } = useMotionPreference()
  const stepPct =
    totalSteps > 0 ? Math.round((stepsCompleted / totalSteps) * 100) : 0
  const masteryPct =
    totalQuestions > 0 ? Math.round((numCorrect / totalQuestions) * 100) : 0

  // Milestone: every question answered correctly. Used for a celebratory glow.
  const milestone = totalQuestions > 0 && masteryPct >= 100

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-sm">
        <span className="min-w-0 font-medium text-slate-600">
          <span className="num font-semibold text-slate-900">
            {stepsCompleted}/{totalSteps}
          </span>{' '}
          steps
        </span>
        <span className="shrink-0 font-medium text-slate-600">
          <span className="num font-semibold text-brand-600">{masteryPct}%</span>{' '}
          mastery
        </span>
      </div>
      <div
        className={`h-3 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-inner transition-shadow duration-500 ${
          milestone ? 'glow-accent' : ''
        }`}
        role="progressbar"
        aria-valuenow={stepPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Lesson progress"
      >
        <motion.div
          className={`h-full rounded-full ${
            accentBar ? `bg-gradient-to-r ${accentBar}` : ''
          }`}
          style={
            accentBar
              ? undefined
              : {
                  backgroundImage:
                    'linear-gradient(to right, #4f46e5 0%, #7c3aed 60%, #14b8a6 130%)',
                }
          }
          initial={{ width: 0 }}
          animate={{
            width: `${stepPct}%`,
            // Subtle breathing pulse once the lesson is fully mastered; only
            // loops when continuous decorative motion is enabled.
            opacity: milestone && animationsEnabled ? [1, 0.7, 1] : 1,
          }}
          transition={{
            width: { duration: 0.6, ease: 'easeOut' },
            opacity:
              milestone && animationsEnabled
                ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 },
          }}
        />
      </div>
    </div>
  )
}
