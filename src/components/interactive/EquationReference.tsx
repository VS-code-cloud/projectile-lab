import type { StepComponentProps } from '../../lessons/types'

/**
 * Demonstration step that presents the reference equations a learner will use in
 * the questions that follow. Each equation is shown as a formula paired with a
 * short plain-language description. Reads `step.equations`.
 */
export default function EquationReference({ step }: StepComponentProps) {
  const equations = step.equations ?? []

  return (
    <div className="space-y-3">
      {equations.map((eq) => (
        <div
          key={eq.formula}
          className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <span className="num text-lg font-semibold text-indigo-700">
            {eq.formula}
          </span>
          <span className="text-sm text-slate-500">{eq.label}</span>
        </div>
      ))}
    </div>
  )
}
