import { useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel, fitLabelFontSize } from './shared/draw'
import { PredictGauge } from './shared/PredictGauge'
import { niceGaugeMax } from './shared/gauge'
import type { StepComponentProps } from '../../lessons/types'

const PLAY_DURATION = 2

/** Display config per asked quantity. */
const VARIANTS = {
  accel: {
    unit: 'm/s\u00B2',
    label: 'Drag the gauge to predict the acceleration, then lock it in.',
  },
  force: {
    unit: 'N',
    label: 'Drag the gauge to predict the net force, then lock it in.',
  },
  mass: {
    unit: 'kg',
    label: 'Drag the gauge to predict the mass, then lock it in.',
  },
} as const

type Variant = keyof typeof VARIANTS

/**
 * Question step for Newton's second law. Renders a block with an applied force
 * and animates it (a = F/m) while the learner predicts the asked quantity (a, F,
 * or m) on a gauge before revealing the true value. One answer per step.
 * @param props.step Provides any two of `params.force`, `params.mass`,
 * `params.accel`, plus `variant`.
 */
export default function ForceQuestion({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const force = step.params?.force
  const mass = step.params?.mass
  const accel =
    step.params?.accel ??
    (force !== undefined && mass !== undefined ? force / mass : 2)

  const variant: Variant =
    step.variant === 'force' || step.variant === 'mass'
      ? step.variant
      : 'accel'
  const cfg = VARIANTS[variant]
  const trueValue = step.expected[0]
  const gaugeMax = niceGaugeMax(trueValue)

  const [playToken, setPlayToken] = useState(answered ? 1 : 0)

  /** Records the prediction and plays the motion animation. */
  function handleSubmit(value: number) {
    setPlayToken((token) => token + 1)
    onSubmit([value])
  }

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ) => {
    const given: string[] = []
    if (force !== undefined && variant !== 'force') given.push(`F = ${force} N`)
    if (mass !== undefined && variant !== 'mass') given.push(`m = ${mass} kg`)
    if (step.params?.accel !== undefined && variant !== 'accel')
      given.push(`a = ${step.params.accel} m/s\u00B2`)
    const header = given.join('    ')
    drawLabel(
      ctx,
      header,
      14,
      18,
      '#475569',
      'left',
      fitLabelFontSize(ctx, header, w - 28),
    )

    const floorY = h * 0.74
    const startX = 96

    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, floorY)
    ctx.lineTo(w, floorY)
    ctx.stroke()
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, floorY, w, h - floorY)

    const maxTravel = 0.5 * 8 * PLAY_DURATION * PLAY_DURATION
    const avail = w - startX - 70
    const x = 0.5 * accel * time * time
    const px = startX + Math.min((x / maxTravel) * avail, avail)

    const blockH = 30
    const blockW = 34
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.roundRect(px - blockW / 2, floorY - blockH, blockW, blockH, 5)
    ctx.fill()
    if (mass !== undefined) {
      drawLabel(ctx, `${mass} kg`, px, floorY - blockH / 2, '#ffffff', 'center')
    }

    const arrowLen = 60
    const tailX = Math.max(px - blockW / 2 - arrowLen, 8)
    drawArrow(
      ctx,
      tailX,
      floorY - blockH / 2,
      px - blockW / 2 - 4,
      floorY - blockH / 2,
      '#1d4ed8',
      3,
    )
    if (force !== undefined) {
      drawLabel(ctx, `F = ${force} N`, tailX, floorY - blockH / 2 - 14, '#1e40af')
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={PLAY_DURATION}
        heightClass="h-44"
      />
      <PredictGauge
        label={cfg.label}
        unit={cfg.unit}
        max={gaugeMax}
        trueValue={trueValue}
        decimals={0}
        answered={answered}
        submittedValue={submittedValues ? submittedValues[0] : null}
        onSubmit={handleSubmit}
        orientation="horizontal"
      />
    </div>
  )
}
