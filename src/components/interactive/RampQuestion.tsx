import { useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawLabel, fitLabelFontSize } from './shared/draw'
import { NumericAnswer } from './shared/NumericAnswer'
import { GRAVITY } from '../../physics/kinematics'
import type { StepComponentProps } from '../../lessons/types'

const RAMP_LENGTH_M = 10

/** Display config per asked quantity. */
const VARIANTS = {
  accel: {
    unit: 'm/s\u00B2',
    decimals: 1,
    label: 'Enter the acceleration down the ramp.',
  },
  normal: {
    unit: 'N',
    decimals: 0,
    label: 'Enter the normal force from the ramp.',
  },
  gravityParallel: {
    unit: 'N',
    decimals: 1,
    label: 'Enter the along-ramp pull of gravity.',
  },
  speed: {
    unit: 'm/s',
    decimals: 1,
    label: 'Enter the speed at the bottom.',
  },
} as const

type Variant = keyof typeof VARIANTS

/**
 * Question step for inclined planes. Shows the ramp scenario, slides the block
 * (a = g·sinθ) on submit, and lets the learner predict the asked quantity
 * (acceleration, normal force, along-ramp force, or final speed) in a numeric
 * box before revealing the answer.
 * @param props.step Provides `params.angleDeg`, `params.mass`,
 * optional `params.length`, and `variant`.
 */
export default function RampQuestion({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const angleDeg = step.params?.angleDeg ?? 30
  const mass = step.params?.mass ?? 2
  const lengthM = step.params?.length ?? RAMP_LENGTH_M
  const rad = (angleDeg * Math.PI) / 180
  const accel = GRAVITY * Math.sin(rad)
  const slideDuration = Math.sqrt((2 * lengthM) / Math.max(accel, 0.01))

  const variant: Variant =
    step.variant === 'normal' ||
    step.variant === 'gravityParallel' ||
    step.variant === 'speed'
      ? step.variant
      : 'accel'
  const cfg = VARIANTS[variant]

  const [playToken, setPlayToken] = useState(answered ? 1 : 0)

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) => {
    const header = `\u03B8 = ${angleDeg}\u00B0    m = ${mass} kg    L = ${lengthM} m`
    drawLabel(
      ctx,
      header,
      14,
      18,
      '#475569',
      'left',
      fitLabelFontSize(ctx, header, w - 28),
    )

    const baseY = h * 0.84
    const left = 56
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const lengthPx = Math.min(
      (w - 120) / Math.max(cos, 0.2),
      (h * 0.58) / Math.max(sin, 0.12),
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
    drawLabel(ctx, `${angleDeg}\u00B0`, ax + 26, ay - 8, '#475569')

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
    <div className="min-w-0 space-y-4">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={slideDuration}
        heightClass="h-48"
      />
      <NumericAnswer
        label={cfg.label}
        unit={cfg.unit}
        answered={answered}
        submittedValues={submittedValues}
        onSubmit={(vals) => {
          setPlayToken((token) => token + 1)
          onSubmit(vals)
        }}
      />
    </div>
  )
}
