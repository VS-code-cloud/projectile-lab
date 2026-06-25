import { motion } from 'framer-motion'

/** Props for {@link AnswerFeedback}. */
interface AnswerFeedbackProps {
  /** Whether the submitted answer was correct. */
  correct: boolean
  /** Explanation shown when the answer is wrong. */
  explanation: string
}

/**
 * Renders post-answer feedback: a green "Great work" box when correct, or a
 * gray "Here's the correct solution and why" box with the explanation when wrong.
 *
 * Motion: a spring "pop" scale-in on correct, a gentle horizontal shake on
 * incorrect. MotionConfig degrades transforms under reduced/off, and the
 * `animate` end-state is always fully visible (opacity 1), so the message is
 * readable regardless of motion preference.
 */
export function AnswerFeedback({ correct, explanation }: AnswerFeedbackProps) {
  if (correct) {
    return (
      <motion.div
        className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 elev-1"
        role="status"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 22 }}
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div>
          <p className="font-display font-semibold text-emerald-900">
            Great work!
          </p>
          <p className="text-sm text-emerald-700">That's correct.</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-800 elev-1"
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
      transition={{
        opacity: { duration: 0.2 },
        x: { duration: 0.4, ease: 'easeInOut' },
      }}
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </span>
      <div>
        <p className="font-display font-semibold text-rose-900">
          Here's the correct solution and why
        </p>
        <p className="mt-1 text-sm leading-relaxed text-rose-700">
          {explanation}
        </p>
      </div>
    </motion.div>
  )
}
