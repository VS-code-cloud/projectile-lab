import { useMemo, useRef, useState } from 'react'
import { CannonCanvas } from '../CannonCanvas'
import type { CanvasMarker, Shot } from '../CannonCanvas'
import { landingFromHeight } from '../../physics/kinematics'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Question step: predict where a projectile fired off a cliff lands by dragging
 * a horizontal target, then fire to compare. One answer per step.
 * @param props.step Provides `params.v`, `params.theta`, and `params.h0`.
 */
export default function CliffLanding({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const v = step.params?.v ?? 20
  const theta = step.params?.theta ?? 45
  const h0 = step.params?.h0 ?? 25
  const trueLanding = landingFromHeight(v, theta, h0)
  const maxValue = Math.max(80, Math.ceil((trueLanding * 1.5) / 10) * 10)

  const [predicted, setPredicted] = useState(
    submittedValues ? submittedValues[0] : Math.round(maxValue / 2),
  )
  const [fireToken, setFireToken] = useState(answered ? 1 : 0)
  const trackRef = useRef<HTMLDivElement>(null)

  /** Records the prediction and plays the cannon animation. */
  function handleFire() {
    setFireToken((token) => token + 1)
    onSubmit([predicted])
  }

  /** Updates the predicted landing distance from a pointer's horizontal position. */
  function updateFromPointer(clientX: number) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    setPredicted(Math.round(ratio * maxValue))
  }

  const shots = useMemo<Shot[]>(
    () => [{ v, thetaDeg: theta, h0, color: '#dc2626' }],
    [v, theta, h0],
  )
  const markers = useMemo<CanvasMarker[]>(
    () => [{ x: trueLanding, y: 0, label: `${trueLanding.toFixed(0)} m`, color: '#0f766e' }],
    [trueLanding],
  )

  const fillPct = (predicted / maxValue) * 100

  return (
    <div className="min-w-0 space-y-4">
      <CannonCanvas
        shots={shots}
        cliffHeight={h0}
        markers={markers}
        guideX={predicted}
        guideXLabel={`Guess: ${predicted} m`}
        fireToken={fireToken}
        heightClass="h-64"
      />

      <div className="min-w-0 space-y-1">
        <div className="break-words rounded-lg bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700">
          Your guess: {predicted} m from the cliff base
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="num shrink-0 text-xs text-slate-500">0 m</span>
          <div
            ref={trackRef}
            onPointerDown={(e) => {
              if (answered) return
              e.currentTarget.setPointerCapture(e.pointerId)
              updateFromPointer(e.clientX)
            }}
            onPointerMove={(e) => {
              if (answered || e.buttons === 0) return
              updateFromPointer(e.clientX)
            }}
            className="relative h-10 min-w-0 flex-1 cursor-ew-resize touch-none rounded-full bg-slate-200 sm:h-8"
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-purple-500"
              style={{ width: `${fillPct}%` }}
            />
            <div
              className="absolute top-1/2 h-12 w-1.5 -translate-y-1/2 rounded-full bg-purple-700"
              style={{ left: `calc(${fillPct}% - 3px)` }}
            />
          </div>
          <span className="num shrink-0 text-xs text-slate-500">{maxValue} m</span>
        </div>
      </div>

      {!answered && (
        <button
          type="button"
          onClick={handleFire}
          className="btn-primary"
        >
          Fire cannonball
        </button>
      )}
    </div>
  )
}
