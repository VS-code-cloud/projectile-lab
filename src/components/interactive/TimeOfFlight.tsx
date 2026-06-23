import { useMemo, useState } from 'react'
import { CannonCanvas } from '../CannonCanvas'
import type { Shot } from '../CannonCanvas'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Question step: predict the time for a projectile to return to launch height.
 * Shows the relevant shot and animates it once the learner submits. One answer.
 * @param props.step Provides `params.v` and `params.theta`.
 */
export default function TimeOfFlight({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const v = step.params?.v ?? 20
  const theta = step.params?.theta ?? 30
  const [value, setValue] = useState(
    submittedValues ? String(submittedValues[0]) : '',
  )
  const [fireToken, setFireToken] = useState(answered ? 1 : 0)

  const shots = useMemo<Shot[]>(
    () => [{ v, thetaDeg: theta, color: '#dc2626' }],
    [v, theta],
  )

  /** Submits the entered time (if valid) and plays the shot animation. */
  function handleSubmit() {
    const t = Number.parseFloat(value)
    if (Number.isNaN(t)) return
    setFireToken((token) => token + 1)
    onSubmit([t])
  }

  return (
    <div className="space-y-4">
      <CannonCanvas shots={shots} fireToken={fireToken} />
      <label className="block text-sm font-medium text-slate-700">
        Time to return to start (s)
        <input
          type="number"
          inputMode="decimal"
          value={value}
          disabled={answered}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
        />
      </label>
      {!answered && (
        <button
          type="button"
          onClick={handleSubmit}
          className="btn-primary"
        >
          Submit answer
        </button>
      )}
    </div>
  )
}
