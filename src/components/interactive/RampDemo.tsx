import { useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
import { GRAVITY } from '../../physics/kinematics'
import type { StepComponentProps } from '../../lessons/types'

const RAMP_LENGTH_M = 10

/**
 * Demonstration of an inclined plane. Drag the angle slider to change the ramp
 * steepness and watch gravity (mg, gray) split into a component along the ramp
 * (mg·sinθ, red) and one pressing into it (mg·cosθ, green). Press Release to let
 * the block slide with acceleration a = g·sinθ.
 * @param props.step Provides default `params.angleDeg` and `params.mass`.
 */
export default function RampDemo({ step }: StepComponentProps) {
  const [angleDeg, setAngleDeg] = useState(step.params?.angleDeg ?? 30)
  const mass = step.params?.mass ?? 2
  const [playToken, setPlayToken] = useState(0)

  const rad = (angleDeg * Math.PI) / 180
  const accel = GRAVITY * Math.sin(rad)
  const slideDuration = Math.sqrt((2 * RAMP_LENGTH_M) / Math.max(accel, 0.01))

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) => {
    const baseY = h * 0.84
    const left = 56
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const lengthPx = Math.min(
      (w - 150) / Math.max(cos, 0.2),
      (h * 0.6) / Math.max(sin, 0.12),
    )
    const run = lengthPx * cos
    const rise = lengthPx * sin
    const ax = left
    const ay = baseY
    const bx = left + run
    const by = baseY - rise

    // Ramp triangle.
    ctx.fillStyle = '#e2e8f0'
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.lineTo(bx, baseY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Angle label near the bottom-left corner.
    drawLabel(ctx, `${angleDeg}°`, ax + 26, ay - 8, '#475569')

    // Block position along the incline (f: 0 at top, 1 at bottom).
    const sMeters = Math.min(0.5 * accel * time * time, RAMP_LENGTH_M)
    const f = sMeters / RAMP_LENGTH_M
    const bxk = left + run * (1 - f)
    const byk = baseY - rise * (1 - f)

    // Block drawn as a small square sitting on the surface.
    const size = 22
    const nOut = { x: -sin, y: -cos }
    const cx = bxk + nOut.x * (size / 2)
    const cy = byk + nOut.y * (size / 2)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-rad)
    ctx.fillStyle = '#4f46e5'
    ctx.beginPath()
    ctx.roundRect(-size / 2, -size / 2, size, size, 4)
    ctx.fill()
    ctx.restore()

    // Force vectors from the block center.
    const scale = 3.2
    const mg = mass * GRAVITY
    const dDown = { x: -cos, y: sin }
    const nIn = { x: sin, y: cos }

    // Total weight (gray, dashed-ish look via thin line).
    drawArrow(ctx, cx, cy, cx, cy + mg * scale, '#94a3b8', 2)
    drawLabel(ctx, 'mg', cx + 6, cy + mg * scale, '#64748b')

    // Parallel component mg·sinθ (red).
    const par = mg * sin
    drawArrow(ctx, cx, cy, cx + dDown.x * par * scale, cy + dDown.y * par * scale, '#dc2626', 3)
    drawLabel(
      ctx,
      'mg·sinθ',
      cx + dDown.x * par * scale - 6,
      cy + dDown.y * par * scale - 10,
      '#b91c1c',
      'right',
    )

    // Perpendicular component mg·cosθ (green).
    const perp = mg * cos
    drawArrow(ctx, cx, cy, cx + nIn.x * perp * scale, cy + nIn.y * perp * scale, '#059669', 3)
    drawLabel(
      ctx,
      'mg·cosθ',
      cx + nIn.x * perp * scale + 6,
      cy + nIn.y * perp * scale,
      '#047857',
    )
  }

  return (
    <div className="space-y-4">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={slideDuration}
        redrawKey={`${angleDeg}`}
        heightClass="h-60"
      />
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">Acceleration down ramp</span>{' '}
        <span className="num font-semibold text-slate-800">
          a = g·sinθ = {accel.toFixed(2)} m/s²
        </span>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Angle: <span className="num">{angleDeg}°</span>
        <input
          type="range"
          min={5}
          max={75}
          step={1}
          value={angleDeg}
          onChange={(e) => setAngleDeg(Number.parseFloat(e.target.value))}
          className="mt-1 w-full"
        />
      </label>
      <button
        type="button"
        onClick={() => setPlayToken((token) => token + 1)}
        className="btn-ghost"
      >
        Release block
      </button>
    </div>
  )
}
