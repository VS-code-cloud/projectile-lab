import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow } from './shared/draw'
import { NumericAnswer } from './shared/NumericAnswer'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Question step for uniform circular motion. Shows the object orbiting at the
 * scenario's speed and radius with tangent velocity and inward acceleration,
 * and records the learner's numeric answer.
 * @param props.step Provides `params.speed`, `params.radius`, and optional `params.mass`.
 */
export default function OrbitQuestion({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const speed = step.params?.speed ?? 10
  const radius = step.params?.radius ?? 5

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
    drawArrow(
      ctx,
      px,
      py,
      px - Math.cos(theta) * Math.min((speed * speed) / radius * 2.4, rPx * 0.9),
      py - Math.sin(theta) * Math.min((speed * speed) / radius * 2.4, rPx * 0.9),
      '#ea580c',
      3,
    )

    ctx.fillStyle = '#4f46e5'
    ctx.beginPath()
    ctx.arc(px, py, 9, 0, Math.PI * 2)
    ctx.fill()
  }

  return (
    <div className="space-y-2">
      <SceneCanvas draw={draw} loop heightClass="h-52" />
      <NumericAnswer
        label="Your answer"
        answered={answered}
        submittedValues={submittedValues}
        onSubmit={onSubmit}
      />
    </div>
  )
}
