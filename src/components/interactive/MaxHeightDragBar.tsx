import { useMemo, useRef, useState } from 'react'
import { CannonCanvas } from '../CannonCanvas'
import type { CanvasMarker, Shot } from '../CannonCanvas'
import { GRAVITY, decompose, maxHeight } from '../../physics/kinematics'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Question step: predict the maximum height of a projectile by dragging a
 * vertical bar, then fire the cannon to compare. One answer per step.
 * @param props.step Provides `params.v` and `params.theta`.
 */
export default function MaxHeightDragBar({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const v = step.params?.v ?? 20
  const theta = step.params?.theta ?? 60
  const trueHeight = maxHeight(v, theta)
  const maxValue = Math.max(20, Math.ceil((trueHeight * 1.8) / 5) * 5)

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

  /** Updates the predicted height from a pointer's vertical position. */
  function updateFromPointer(clientY: number) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(Math.max((rect.bottom - clientY) / rect.height, 0), 1)
    setPredicted(Math.round(ratio * maxValue))
  }

  const shots = useMemo<Shot[]>(
    () => [{ v, thetaDeg: theta, color: '#dc2626' }],
    [v, theta],
  )
  const markers = useMemo<CanvasMarker[]>(() => {
    const { vx, vy } = decompose(v, theta)
    const apexX = vx * (vy / GRAVITY)
    return [{ x: apexX, y: trueHeight, label: `${trueHeight.toFixed(0)} m`, color: '#0f766e' }]
  }, [v, theta, trueHeight])

  const fillPct = (predicted / maxValue) * 100

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="flex shrink-0 flex-col items-center">
          <span className="mb-1 text-xs text-slate-500">{maxValue} m</span>
          <div
            ref={trackRef}
            onPointerDown={(e) => {
              if (answered) return
              e.currentTarget.setPointerCapture(e.pointerId)
              updateFromPointer(e.clientY)
            }}
            onPointerMove={(e) => {
              if (answered || e.buttons === 0) return
              updateFromPointer(e.clientY)
            }}
            className="relative h-56 w-10 cursor-ns-resize touch-none rounded-full bg-slate-200"
          >
            <div
              className="absolute bottom-0 w-full rounded-full bg-purple-500"
              style={{ height: `${fillPct}%` }}
            />
            <div
              className="absolute left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-purple-700"
              style={{ bottom: `calc(${fillPct}% - 3px)` }}
            />
          </div>
          <span className="mt-1 text-xs text-slate-500">0 m</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="break-words rounded-lg bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700">
            Your guess: {predicted} m
          </div>
          <CannonCanvas
            shots={shots}
            markers={markers}
            guideHeight={predicted}
            guideLabel={`Guess: ${predicted} m`}
            fireToken={fireToken}
            heightClass="h-48"
          />
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
