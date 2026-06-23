import { useMemo, useState } from 'react'
import { CannonCanvas } from '../CannonCanvas'
import type { Shot } from '../CannonCanvas'
import type { StepComponentProps } from '../../lessons/types'

/** Launch height (m) used so the horizontal cannon visibly travels before landing. */
const HORIZONTAL_LAUNCH_HEIGHT = 20

/**
 * Demonstration showing the two 1D equations side by side: a vertical cannon
 * following y = vt - gt^2 and a horizontal cannon following x = vt. Firing both
 * highlights that the directions evolve independently.
 * @param props.step Provides `params.v` for the launch speed.
 */
export default function TwoPanelEquations({ step }: StepComponentProps) {
  const v = step.params?.v ?? 20
  const [fireToken, setFireToken] = useState(0)

  const verticalShots = useMemo<Shot[]>(
    () => [{ v, thetaDeg: 90, color: '#4f46e5' }],
    [v],
  )
  const horizontalShots = useMemo<Shot[]>(
    () => [{ v, thetaDeg: 0, h0: HORIZONTAL_LAUNCH_HEIGHT, color: '#16a34a' }],
    [v],
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-center font-mono text-sm text-slate-700">
            y = vt - gt&sup2;
          </p>
          <CannonCanvas shots={verticalShots} fireToken={fireToken} heightClass="h-56" />
          <p className="text-center text-xs text-slate-500">Vertical motion</p>
        </div>
        <div className="space-y-2">
          <p className="text-center font-mono text-sm text-slate-700">x = vt</p>
          <CannonCanvas shots={horizontalShots} fireToken={fireToken} heightClass="h-56" />
          <p className="text-center text-xs text-slate-500">Horizontal motion</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setFireToken((t) => t + 1)}
        className="btn-primary"
      >
        Fire both
      </button>
    </div>
  )
}
