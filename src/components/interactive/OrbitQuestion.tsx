import { useRef } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel, fitLabelFontSize } from './shared/draw'
import { PredictGauge } from './shared/PredictGauge'
import { niceGaugeMax } from './shared/gauge'
import type { StepComponentProps } from '../../lessons/types'

/** Display config per asked quantity. */
const VARIANTS = {
  accel: {
    unit: 'm/s\u00B2',
    decimals: 0,
    label: 'Drag the gauge to predict the centripetal acceleration.',
  },
  period: {
    unit: 's',
    decimals: 1,
    label: 'Drag the gauge to predict the period of one revolution.',
  },
  force: {
    unit: 'N',
    decimals: 0,
    label: 'Drag the gauge to predict the centripetal force.',
  },
  velocity: {
    unit: 'm/s',
    decimals: 0,
    label: 'Drag the gauge to predict the speed.',
  },
} as const

type Variant = keyof typeof VARIANTS

/** State captured the instant the object is released to fly off tangentially. */
interface Release {
  /** Animation time (s) at release. */
  t0: number
  /** Release position (px). */
  x: number
  y: number
  /** Unit travel direction (tangent to the circle). */
  dx: number
  dy: number
  /** Max distance to travel before stopping just short of the edge (px). */
  maxDist: number
}

/**
 * Distance from a point along a unit direction until it reaches the bounding
 * rectangle, used to stop the freed object just short of the canvas edge.
 */
function distanceToEdge(
  px: number,
  py: number,
  dx: number,
  dy: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): number {
  let t = Infinity
  if (dx > 1e-6) t = Math.min(t, (maxX - px) / dx)
  else if (dx < -1e-6) t = Math.min(t, (minX - px) / dx)
  if (dy > 1e-6) t = Math.min(t, (maxY - py) / dy)
  else if (dy < -1e-6) t = Math.min(t, (minY - py) / dy)
  return Number.isFinite(t) ? Math.max(t, 0) : 0
}

/**
 * Question step for uniform circular motion. Shows the object orbiting at the
 * scenario's speed and radius with tangent velocity and inward acceleration, and
 * lets the learner predict the asked quantity (acceleration, period, or force)
 * on a gauge before revealing the answer.
 * @param props.step Provides `params.speed`, `params.radius`, optional
 * `params.mass`, and `variant`.
 */
export default function OrbitQuestion({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const radius = step.params?.radius ?? 5
  const mass = step.params?.mass

  const variant: Variant =
    step.variant === 'period' ||
    step.variant === 'force' ||
    step.variant === 'velocity'
      ? step.variant
      : 'accel'
  const cfg = VARIANTS[variant]
  const trueValue = step.expected[0]
  const gaugeMax = niceGaugeMax(trueValue)
  // For the velocity variant the speed is the unknown, so derive it from the
  // answer (v = √(a·r)); acceleration is the given quantity instead.
  const speed = variant === 'velocity' ? trueValue : (step.params?.speed ?? 10)
  const accelGiven = step.params?.accel ?? (speed * speed) / radius

  // Captured once when the velocity question is answered, so the object can
  // detach and fly off in a straight line instead of continuing to orbit.
  const releaseRef = useRef<Release | null>(null)
  const flyOff = variant === 'velocity' && answered

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) => {
    const given =
      variant === 'velocity'
        ? `a = ${accelGiven} m/s\u00B2    r = ${radius} m`
        : `v = ${speed} m/s    r = ${radius} m` +
          (mass !== undefined ? `    m = ${mass} kg` : '')
    drawLabel(
      ctx,
      given,
      14,
      18,
      '#475569',
      'left',
      fitLabelFontSize(ctx, given, w - 28),
    )

    const cx = w / 2
    const cy = h / 2 + 8
    const rPx = Math.min(20 + radius * 14, Math.min(w, h) * 0.34)
    const omega = speed / radius
    const theta = omega * time

    // Circle path + center (always shown, even after the object is freed).
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fill()

    if (flyOff) {
      // Release the object tangentially (perpendicular to the radius) at the
      // speed it had, then let it coast to a stop just short of the edge.
      if (releaseRef.current === null) {
        const rx = cx + rPx * Math.cos(theta)
        const ry = cy + rPx * Math.sin(theta)
        const dx = -Math.sin(theta)
        const dy = Math.cos(theta)
        const margin = 16
        const edge = distanceToEdge(
          rx,
          ry,
          dx,
          dy,
          margin,
          margin,
          w - margin,
          h - margin,
        )
        releaseRef.current = {
          t0: time,
          x: rx,
          y: ry,
          dx,
          dy,
          maxDist: Math.max(0, edge - 10),
        }
      }
      const rel = releaseRef.current
      const pxPerSec = omega * rPx
      const dist = Math.min(pxPerSec * (time - rel.t0), rel.maxDist)
      const bx = rel.x + rel.dx * dist
      const by = rel.y + rel.dy * dist

      // Straight trail from the release point to the object.
      ctx.save()
      ctx.strokeStyle = '#94a3b8'
      ctx.setLineDash([5, 4])
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(rel.x, rel.y)
      ctx.lineTo(bx, by)
      ctx.stroke()
      ctx.restore()

      // Velocity stays constant in magnitude and direction (no acceleration).
      drawArrow(ctx, bx, by, bx + rel.dx * 26, by + rel.dy * 26, '#2563eb', 3)

      ctx.fillStyle = '#4f46e5'
      ctx.beginPath()
      ctx.arc(bx, by, 9, 0, Math.PI * 2)
      ctx.fill()
      return
    }

    const px = cx + rPx * Math.cos(theta)
    const py = cy + rPx * Math.sin(theta)

    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(px, py)
    ctx.stroke()

    const vLen = Math.min(speed * 6, rPx * 0.9)
    drawArrow(
      ctx,
      px,
      py,
      px - Math.sin(theta) * vLen,
      py + Math.cos(theta) * vLen,
      '#2563eb',
      3,
    )
    const aLen = Math.min(((speed * speed) / radius) * 2.4, rPx * 0.9)
    drawArrow(
      ctx,
      px,
      py,
      px - Math.cos(theta) * aLen,
      py - Math.sin(theta) * aLen,
      '#ea580c',
      3,
    )

    ctx.fillStyle = '#4f46e5'
    ctx.beginPath()
    ctx.arc(px, py, 9, 0, Math.PI * 2)
    ctx.fill()
  }

  return (
    <div className="min-w-0 space-y-4">
      <SceneCanvas draw={draw} loop heightClass="h-52" />
      <PredictGauge
        label={cfg.label}
        unit={cfg.unit}
        max={gaugeMax}
        trueValue={trueValue}
        decimals={cfg.decimals}
        answered={answered}
        submittedValue={submittedValues ? submittedValues[0] : null}
        onSubmit={(v) => onSubmit([v])}
        orientation="horizontal"
      />
    </div>
  )
}
