import { useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Demonstration of uniform circular motion. Adjust speed and radius to see the
 * object circle at constant speed while its velocity (blue) stays tangent and
 * its acceleration (orange) always points toward the center. The centripetal
 * acceleration a = v²/r is shown live.
 * @param props.step Provides default `params.speed` and `params.radius`.
 */
export default function OrbitDemo({ step }: StepComponentProps) {
  const [speed, setSpeed] = useState(step.params?.speed ?? 8)
  const [radius, setRadius] = useState(step.params?.radius ?? 5)

  const accel = (speed * speed) / radius

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) => {
    const cx = w / 2
    const cy = h / 2
    const rPx = Math.min(20 + radius * 14, Math.min(w, h) * 0.36)
    const omega = speed / radius
    const theta = omega * time

    // Orbit path.
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2)
    ctx.stroke()

    // Center marker.
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fill()

    const px = cx + rPx * Math.cos(theta)
    const py = cy + rPx * Math.sin(theta)

    // Radius line.
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(px, py)
    ctx.stroke()

    // Velocity (tangent, blue).
    const vLen = Math.min(speed * 6, rPx * 0.9)
    const tx = -Math.sin(theta)
    const ty = Math.cos(theta)
    drawArrow(ctx, px, py, px + tx * vLen, py + ty * vLen, '#2563eb', 3)
    drawLabel(ctx, 'v', px + tx * vLen + tx * 6, py + ty * vLen + ty * 6, '#1d4ed8')

    // Centripetal acceleration (toward center, orange).
    const aLen = Math.min(accel * 2.4, rPx * 0.9)
    drawArrow(ctx, px, py, px - Math.cos(theta) * aLen, py - Math.sin(theta) * aLen, '#ea580c', 3)

    // The orbiting object.
    ctx.fillStyle = '#4f46e5'
    ctx.beginPath()
    ctx.arc(px, py, 9, 0, Math.PI * 2)
    ctx.fill()
  }

  return (
    <div className="space-y-4">
      <SceneCanvas draw={draw} loop heightClass="h-60" />
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">Centripetal acceleration</span>{' '}
        <span className="num font-semibold text-slate-800">
          a = v²/r = {accel.toFixed(2)} m/s²
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Speed: <span className="num">{speed} m/s</span>
          <input
            type="range"
            min={2}
            max={12}
            step={1}
            value={speed}
            onChange={(e) => setSpeed(Number.parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Radius: <span className="num">{radius} m</span>
          <input
            type="range"
            min={2}
            max={8}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number.parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
      </div>
    </div>
  )
}
