import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
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
} as const

type Variant = keyof typeof VARIANTS

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
  const speed = step.params?.speed ?? 10
  const radius = step.params?.radius ?? 5
  const mass = step.params?.mass

  const variant: Variant =
    step.variant === 'period' || step.variant === 'force'
      ? step.variant
      : 'accel'
  const cfg = VARIANTS[variant]
  const trueValue = step.expected[0]
  const gaugeMax = niceGaugeMax(trueValue)

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) => {
    const given =
      `v = ${speed} m/s    r = ${radius} m` +
      (mass !== undefined ? `    m = ${mass} kg` : '')
    drawLabel(ctx, given, 14, 18, '#475569')

    const cx = w / 2
    const cy = h / 2 + 8
    const rPx = Math.min(20 + radius * 14, Math.min(w, h) * 0.34)
    const omega = speed / radius
    const theta = omega * time

    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fill()

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
    <div className="space-y-4">
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
      />
    </div>
  )
}
