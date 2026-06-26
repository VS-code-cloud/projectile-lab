import { useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
import { GRAVITY } from '../../physics/kinematics'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Demonstration that motivates v = sqrt(2aL). A block is released from rest and
 * slides the length L of a frictionless ramp (a = g*sin(theta)). Alongside the
 * ramp, a live speed-vs-distance plot traces v = sqrt(2a*x), making the
 * square-root growth visible and landing the derivation: starting from rest,
 * v^2 = 2aL at the bottom. Speed is independent of mass, which the caption notes.
 * @param props.step Provides default `params.angleDeg` and `params.length`.
 */
export default function RampSpeedDemo({ step }: StepComponentProps) {
  const [angleDeg, setAngleDeg] = useState(step.params?.angleDeg ?? 30)
  const lengthM = step.params?.length ?? 10
  const [playToken, setPlayToken] = useState(1)

  const rad = (angleDeg * Math.PI) / 180
  const accel = GRAVITY * Math.sin(rad)
  const vBottom = Math.sqrt(2 * accel * lengthM)
  const slideDuration = Math.sqrt((2 * lengthM) / Math.max(accel, 0.01))

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) => {
    const t = Math.min(time, slideDuration)
    const sMeters = Math.min(0.5 * accel * t * t, lengthM)
    const vNow = Math.min(accel * t, vBottom)
    const f = sMeters / lengthM

    // ---- Left: the ramp with the sliding block ----
    const baseY = h * 0.82
    const left = 38
    const leftW = w * 0.54
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const lengthPx = Math.min(
      (leftW - 70) / Math.max(cos, 0.2),
      (h * 0.56) / Math.max(sin, 0.12),
    )
    const run = lengthPx * cos
    const rise = lengthPx * sin
    const ax = left
    const ay = baseY
    const bx = left + run
    const by = baseY - rise

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
    drawLabel(ctx, `${angleDeg}\u00B0`, bx - 6, baseY - 8, '#475569', 'right')
    drawLabel(ctx, `L = ${lengthM} m`, (ax + bx) / 2, (ay + by) / 2 - 12, '#64748b', 'center')

    // Block position along the incline (top -> bottom).
    const bxk = left + run * (1 - f)
    const byk = baseY - rise * (1 - f)
    const size = 20
    const cx = bxk + -sin * (size / 2)
    const cy = byk + -cos * (size / 2)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-rad)
    ctx.fillStyle = '#f43f5e'
    ctx.beginPath()
    ctx.roundRect(-size / 2, -size / 2, size, size, 4)
    ctx.fill()
    ctx.restore()

    // Velocity arrow pointing down-slope, length proportional to current speed.
    const vScale = (lengthPx * 0.5) / Math.max(vBottom, 0.01)
    const dDown = { x: -cos, y: sin }
    drawArrow(
      ctx,
      cx,
      cy,
      cx + dDown.x * vNow * vScale,
      cy + dDown.y * vNow * vScale,
      '#1d4ed8',
      3,
    )

    // ---- Right: speed vs distance plot, tracing v = sqrt(2a*x) ----
    const plotLeft = w * 0.62
    const plotRight = w - 16
    const plotTop = 26
    const plotBottom = h * 0.8
    const plotW = plotRight - plotLeft
    const plotH = plotBottom - plotTop
    if (plotW > 40 && plotH > 40) {
      // Axes.
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(plotLeft, plotTop)
      ctx.lineTo(plotLeft, plotBottom)
      ctx.lineTo(plotRight, plotBottom)
      ctx.stroke()
      drawLabel(ctx, 'v', plotLeft - 6, plotTop + 4, '#64748b', 'right')
      drawLabel(ctx, 'x', plotRight, plotBottom + 12, '#64748b', 'right')

      const mapX = (x: number) => plotLeft + (x / lengthM) * plotW
      const mapY = (v: number) => plotBottom - (v / Math.max(vBottom, 0.01)) * plotH

      // The square-root curve v = sqrt(2a*x).
      ctx.strokeStyle = '#a855f7'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      const steps = 48
      for (let i = 0; i <= steps; i += 1) {
        const x = (i / steps) * lengthM
        const v = Math.sqrt(2 * accel * x)
        const pxq = mapX(x)
        const pyq = mapY(v)
        if (i === 0) ctx.moveTo(pxq, pyq)
        else ctx.lineTo(pxq, pyq)
      }
      ctx.stroke()

      // Moving marker at the block's current (x, v).
      const mx = mapX(sMeters)
      const my = mapY(vNow)
      ctx.fillStyle = '#1d4ed8'
      ctx.beginPath()
      ctx.arc(mx, my, 4.5, 0, Math.PI * 2)
      ctx.fill()
      drawLabel(ctx, `v = ${vNow.toFixed(1)} m/s`, plotLeft + 2, plotTop - 2, '#7e22ce')
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={slideDuration}
        redrawKey={`${angleDeg}-${lengthM}`}
        heightClass="h-60"
      />
      <div className="break-words rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">From rest, v² = 2aL with a = g·sinθ:</span>{' '}
        <span className="num font-semibold text-slate-800">
          v = √(2aL) = {vBottom.toFixed(1)} m/s
        </span>
        <span className="text-slate-500"> (the mass doesn't matter).</span>
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
          className="mt-1 w-full touch-manipulation"
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
