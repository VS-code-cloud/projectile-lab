import type { StepComponentProps } from '../../lessons/types'

/**
 * Demonstration step that presents the reference equations a learner will use in
 * the questions that follow. Each equation is shown as a formula paired with a
 * short plain-language description. Reads `step.equations`.
 */
export default function EquationReference({ step }: StepComponentProps) {
  const equations = step.equations ?? []

  if (equations.length === 0) {
    return <div className="space-y-3" />
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-white p-3 elev-1 sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-grid opacity-70" />
      <div className="relative mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-semibold text-slate-900">
            References
          </p>
        </div>
        <div
          aria-hidden
          className="hidden h-16 w-40 overflow-hidden rounded-2xl border border-brand-100 bg-white/75 p-2 shadow-sm sm:block"
        >
          <svg
            viewBox="0 0 160 64"
            className="h-full w-full text-brand-500"
            fill="none"
          >
            <path
              d="M12 48 H44 L58 18 L78 48 H148"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
            <path
              d="M96 20 H132 M96 32 H122 M96 44 H140"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="3"
              opacity="0.45"
            />
            <circle cx="58" cy="18" r="6" className="fill-accent-500" />
            <circle cx="78" cy="48" r="6" className="fill-brand-600" />
          </svg>
        </div>
      </div>

      <div className="relative grid gap-3">
        {equations.map((eq, i) => (
          <div
            key={`${eq.formula}-${i}`}
            className="relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm"
          >
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-500 to-accent-500"
            />
            <div
              aria-hidden
              className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-brand-100/70 blur-2xl"
            />
            <div className="relative flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
              <div className="min-w-0">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-brand-600">
                  Formula {i + 1}
                </span>
                <span className="num mt-1 block min-w-0 break-words text-xl font-semibold text-indigo-700">
                  {eq.formula}
                </span>
              </div>
              <div className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2">
                <span
                  aria-hidden
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500"
                />
                <span className="text-sm leading-relaxed text-slate-600">
                  {eq.label}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
