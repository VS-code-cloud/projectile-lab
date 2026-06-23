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
 */
export function AnswerFeedback({ correct, explanation }: AnswerFeedbackProps) {
  if (correct) {
    return (
      <div
        className="flex items-start gap-3 rounded-xl border border-green-300 bg-green-50 p-4 text-green-800"
        role="status"
      >
        <svg
          className="mt-0.5 shrink-0"
          width="20"
          height="20"
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
        <div>
          <p className="font-semibold">Great work!</p>
          <p className="text-sm">That's correct.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-100 p-4 text-slate-700"
      role="status"
    >
      <svg
        className="mt-0.5 shrink-0 text-slate-400"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <div>
        <p className="font-semibold">Here's the correct solution and why</p>
        <p className="mt-1 text-sm leading-relaxed">{explanation}</p>
      </div>
    </div>
  )
}
