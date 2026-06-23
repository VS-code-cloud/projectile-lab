import { useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawLabel } from './shared/draw'
import { NumericAnswer } from './shared/NumericAnswer'
import { GRAVITY } from '../../physics/kinematics'
import type { StepComponentProps } from '../../lessons/types'

const RAMP_LENGTH_M = 10

/**
 * Question step for inclined planes. Shows the ramp scenario and slides the
 * block (a = g·sinθ) once the learner submits a numeric answer.
 * @param props.step Provides `params.angleDeg`, `params.mass`, and optional `params.length`.
 */
export default function RampQuestion({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const angleDeg = step.params?.angleDeg ?? 30
  const lengthM = step.params?.length ?? RAMP_LENGTH_M
  const rad = (angleDeg * Math.PI) / 180
  const accel = GRAVITY * Math.sin(rad)
  const slideDuration = Math.sqrt((2 * lengthM) / Math.max(accel, 0.01))

  const [playToken, setPlayToken] = useState(answered ? 1 : 0)

  /** Plays the slide animation and records the answer. */
  function handleSubmit(values: number[]) {
    setPlayToken((token) => token + 1)
    onSubmit(values)
  }

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) => {
    const baseY = h * 0.82
    const left = 56
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const lengthPx = Math.min(
      (w - 120) / Math.max(cos, 0.2),
      (h * 0.6) / Math.max(sin, 0.12),
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
    drawLabel(ctx, `${angleDeg}°`, ax + 26, ay - 8, '#475569')

    const sMeters = Math.min(0.5 * accel * time * time, lengthM)
    const f = sMeters / lengthM
    const bxk = left + run * (1 - f)
    const byk = baseY - rise * (1 - f)

    const size = 22
    const cx = bxk + -sin * (size / 2)
    const cy = byk + -cos * (size / 2)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-rad)
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.roundRect(-size / 2, -size / 2, size, size, 4)
    ctx.fill()
    ctx.restore()
  }

  return (
    <div className="space-y-2">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={slideDuration}
        heightClass="h-48"
      />
      <NumericAnswer
        label="Your answer"
        answered={answered}
        submittedValues={submittedValues}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
