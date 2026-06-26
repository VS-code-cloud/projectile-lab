import { useState } from 'react'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Neutral pre-lesson retrieval prompt. Learners commit to a conceptual hunch
 * before instruction, but the response is not graded as right or wrong.
 */
export default function ConceptPretrieval({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const options = step.options ?? []
  const [selected, setSelected] = useState<number | null>(
    submittedValues ? submittedValues[0] : null,
  )

  /** Saves the current hunch as an ungraded response. */
  function submit() {
    if (selected === null) return
    onSubmit([selected])
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
        <p className="font-display font-semibold text-amber-950">
          Make a prediction before learning.
        </p>
        <p className="mt-1">
          This is intentionally ungraded. Pick the idea that feels most plausible
          right now, even if you are unsure.
        </p>
      </div>

      <fieldset className="space-y-2" disabled={answered}>
        <legend className="sr-only">Choose your pre-lesson prediction</legend>
        {options.map((option, i) => {
          const id = `${step.uid}-option-${i}`
          const checked = selected === i
          return (
            <label
              key={option}
              htmlFor={id}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-relaxed transition ${
                checked
                  ? 'border-brand-300 bg-brand-50 text-brand-900 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200'
              } ${answered ? 'cursor-default opacity-90' : ''}`}
            >
              <input
                id={id}
                type="radio"
                name={step.uid}
                value={i}
                checked={checked}
                onChange={() => setSelected(i)}
                className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
              />
              <span>{option}</span>
            </label>
          )
        })}
      </fieldset>

      {!answered && (
        <button
          type="button"
          onClick={submit}
          disabled={selected === null}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save my prediction
        </button>
      )}

      {answered && (
        <div
          className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-800"
          role="status"
        >
          <p className="font-display font-semibold text-sky-950">
            Prediction saved, no score attached.
          </p>
          <p className="mt-1">{step.explanation}</p>
        </div>
      )}
    </div>
  )
}
