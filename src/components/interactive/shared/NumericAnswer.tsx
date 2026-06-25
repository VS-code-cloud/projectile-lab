import { useState } from 'react'

/** Props for {@link NumericAnswer}. */
interface NumericAnswerProps {
  /** Field label shown above the input. */
  label: string
  /** Optional unit suffix (e.g. "m/s"). */
  unit?: string
  /** True once an answer has been submitted (locks the input). */
  answered: boolean
  /** Previously submitted values, used to prefill when revisiting. */
  submittedValues: number[] | null
  /** Called with the parsed answer when the user submits. */
  onSubmit: (values: number[]) => void
  /** Submit button label. Defaults to "Submit answer". */
  buttonLabel?: string
}

/**
 * A single-value numeric answer field with a submit button, shared by question
 * steps. Validates the input is a number and locks after one submission.
 */
export function NumericAnswer({
  label,
  unit,
  answered,
  submittedValues,
  onSubmit,
  buttonLabel = 'Submit answer',
}: NumericAnswerProps) {
  const [value, setValue] = useState(
    submittedValues ? String(submittedValues[0]) : '',
  )

  /** Parses and submits the entered value if it is a valid number. */
  function submit() {
    const parsed = Number.parseFloat(value)
    if (Number.isNaN(parsed)) return
    onSubmit([parsed])
  }

  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            disabled={answered}
            onChange={(e) => setValue(e.target.value)}
            className="num w-full max-w-[10rem] rounded-lg border border-slate-300 px-3 py-2 sm:w-40 sm:max-w-none disabled:bg-slate-100"
          />
          {unit && <span className="text-sm text-slate-500">{unit}</span>}
        </div>
      </label>
      {!answered && (
        <button type="button" onClick={submit} className="btn-primary">
          {buttonLabel}
        </button>
      )}
    </div>
  )
}
