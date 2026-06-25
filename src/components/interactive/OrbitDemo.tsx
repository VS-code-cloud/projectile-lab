import { useRef, useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
import type { StepComponentProps } from '../../lessons/types'

/** Radius slider bounds (m); shared with the circle-size mapping. */
const RADIUS_MIN = 2
const RADIUS_MAX = 8

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

  // Accumulated orbital angle. Integrating angular velocity over time (rather
  // than recomputing theta = omega * t) keeps the ball at its current spot when
  // the speed/radius changes — it simply starts turning faster or slower from
  // there instead of jumping to a new point on the circle.
  const phaseRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) => {
    const cx = w / 2
    const cy = h / 2
    // Map radius across its full range to a span of pixel sizes so every step
    // from 2–8 m is visibly larger than the last (the old linear+clamp formula
    // saturated past ~5 m, making larger circles look identical).
    const maxR = Math.min(w, h) * 0.36
    const minR = maxR * 0.42
    const rFrac = (radius - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)
    const rPx = minR + (maxR - minR) * Math.max(0, Math.min(1, rFrac))
    const omega = speed / radius

    if (lastTimeRef.current === null) lastTimeRef.current = time
    const dt = time - lastTimeRef.current
    lastTimeRef.current = time
    // Clamp dt so a backgrounded tab (paused rAF) doesn't jump the phase.
    phaseRef.current += omega * Math.min(Math.max(dt, 0), 0.05)
    const theta = phaseRef.current

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
    <div className="min-w-0 space-y-4">
      <SceneCanvas draw={draw} loop heightClass="h-60" />
      <div className="break-words rounded-lg bg-slate-50 px-3 py-2 text-sm">
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
            className="mt-1 w-full touch-manipulation"
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
            className="mt-1 w-full touch-manipulation"
          />
        </label>
      </div>
    </div>
  )
}
