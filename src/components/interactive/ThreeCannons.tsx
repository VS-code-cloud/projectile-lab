import { useMemo, useState } from 'react'
import { CannonCanvas } from '../CannonCanvas'
import type { Shot } from '../CannonCanvas'
import { rangeFlat } from '../../physics/kinematics'
import type { StepComponentProps } from '../../lessons/types'

const ANGLES = [
  { theta: 30, color: '#0ea5e9' },
  { theta: 45, color: '#16a34a' },
  { theta: 60, color: '#f97316' },
]

/**
 * Demonstration that fires three cannons at 30, 45, and 60 degrees with equal
 * speed so the learner can empirically see that 45 degrees travels farthest.
 * @param props.step Provides `params.speed` for the launch speed.
 */
export default function ThreeCannons({ step }: StepComponentProps) {
  const speed = step.params?.speed ?? 30
  const [fireToken, setFireToken] = useState(0)

  const shots = useMemo<Shot[]>(
    () =>
      ANGLES.map(({ theta, color }) => ({
        v: speed,
        thetaDeg: theta,
        color,
        label: `${theta}\u00B0: ${rangeFlat(speed, theta).toFixed(0)} m`,
      })),
    [speed],
  )

  return (
    <div className="min-w-0 space-y-4">
      <CannonCanvas shots={shots} fireToken={fireToken} heightClass="h-72" />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {ANGLES.map(({ theta, color }) => (
          <span key={theta} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {theta}&deg;
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setFireToken((t) => t + 1)}
        className="btn-primary"
      >
        Fire all cannons
      </button>
    </div>
  )
}
