import { useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
import type { StepComponentProps } from '../../lessons/types'

const MAX_FORCE = 30
const MAX_MASS = 10
const PLAY_DURATION = 2

/**
 * Demonstration of Newton's second law (F = m·a). Adjust the applied force and
 * the block's mass with sliders and press Play to watch how acceleration
 * (a = F/m) changes how quickly the block speeds up across the surface.
 * @param props.step Provides default `params.force` and `params.mass`.
 */
export default function ForceSledDemo({ step }: StepComponentProps) {
  const [force, setForce] = useState(step.params?.force ?? 12)
  const [mass, setMass] = useState(step.params?.mass ?? 4)
  const [playToken, setPlayToken] = useState(0)

  const accel = force / mass

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) => {
    const floorY = h * 0.74
    const startX = 70

    // Floor.
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, floorY)
    ctx.lineTo(w, floorY)
    ctx.stroke()
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, floorY, w, h - floorY)

    // Fixed scale so a stronger force visibly travels farther than a weaker one.
    const aMax = MAX_FORCE / 1
    const maxTravel = 0.5 * aMax * PLAY_DURATION * PLAY_DURATION
    const avail = w - startX - 70
    const x = 0.5 * accel * time * time
    const px = startX + Math.min((x / maxTravel) * avail, avail)

    // Block sized by mass.
    const blockH = 26 + mass * 3
    const blockW = 30 + mass * 3
    ctx.fillStyle = '#4f46e5'
    ctx.beginPath()
    ctx.roundRect(px - blockW / 2, floorY - blockH, blockW, blockH, 5)
    ctx.fill()
    drawLabel(
      ctx,
      `${mass} kg`,
      px,
      floorY - blockH / 2,
      '#ffffff',
      'center',
    )

    // Applied force arrow, length scaled to the force magnitude.
    const arrowLen = 20 + (force / MAX_FORCE) * 70
    drawArrow(
      ctx,
      px - blockW / 2 - arrowLen,
      floorY - blockH / 2,
      px - blockW / 2 - 4,
      floorY - blockH / 2,
      '#dc2626',
      3,
    )
    drawLabel(
      ctx,
      `F = ${force} N`,
      px - blockW / 2 - arrowLen,
      floorY - blockH / 2 - 14,
      '#b91c1c',
    )
  }

  return (
    <div className="space-y-4">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={PLAY_DURATION}
        redrawKey={`${force}-${mass}`}
        heightClass="h-52"
      />
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">Acceleration</span>{' '}
        <span className="num font-semibold text-slate-800">
          a = F/m = {accel.toFixed(2)} m/s²
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Force: <span className="num">{force} N</span>
          <input
            type="range"
            min={1}
            max={MAX_FORCE}
            step={1}
            value={force}
            onChange={(e) => setForce(Number.parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Mass: <span className="num">{mass} kg</span>
          <input
            type="range"
            min={1}
            max={MAX_MASS}
            step={1}
            value={mass}
            onChange={(e) => setMass(Number.parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => setPlayToken((token) => token + 1)}
        className="btn-ghost"
      >
        Play motion
      </button>
    </div>
  )
}
