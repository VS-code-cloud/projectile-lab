import { useMemo, useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel, fitLabelFontSize } from './shared/draw'
import { PredictGauge } from './shared/PredictGauge'
import { NumericAnswer } from './shared/NumericAnswer'
import { niceGaugeMax } from './shared/gauge'
import type { StepComponentProps } from '../../lessons/types'

/** Display config per asked quantity. */
const VARIANTS = {
  velocity: {
    unit: 'm/s',
    decimals: 0,
    label: 'Drag the gauge to predict the final velocity, then lock it in.',
  },
  distance: {
    unit: 'm',
    decimals: 0,
    label: 'Enter how far the cart travels (m), then submit.',
  },
} as const

/**
 * Question step for 1-D motion. Animates the scenario cart through
 * x = v0·t + ½·a·t² and lets the learner predict the final velocity or distance
 * on a gauge before revealing the true value. One answer per step.
 * @param props.step Provides `params.v0`, `params.a`, `params.t`, and `variant`.
 */
export default function MotionQuestion({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const v0 = step.params?.v0 ?? 0
  const a = step.params?.a ?? 0
  const duration = step.params?.t ?? 4

  const variant = step.variant === 'distance' ? 'distance' : 'velocity'
  const cfg = VARIANTS[variant]
  const trueValue = step.expected[0]
  const gaugeMax = niceGaugeMax(trueValue)

  const [playToken, setPlayToken] = useState(answered ? 1 : 0)

  const xAt = useMemo(
    () => (tt: number) => v0 * tt + 0.5 * a * tt * tt,
    [v0, a],
  )
  const xMax = Math.max(xAt(duration), 0.001)

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
    const header = `v\u2080 = ${v0} m/s    a = ${a} m/s\u00B2`
    drawLabel(
      ctx,
      header,
      14,
      18,
      '#475569',
      'left',
      fitLabelFontSize(ctx, header, w - 28),
    )

    const left = 44
    const right = 24
    const trackW = w - left - right
    const trackY = h * 0.64
    const toPx = (x: number) => left + (x / xMax) * trackW

    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(left, trackY)
    ctx.lineTo(w - right, trackY)
    ctx.stroke()

    drawLabel(ctx, '0', left, trackY + 16, '#94a3b8', 'center')
    drawLabel(
      ctx,
      `${xMax.toFixed(0)} m`,
      w - right,
      trackY + 16,
      '#94a3b8',
      'center',
    )

    const cx = toPx(xAt(time))
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.35)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(left, trackY)
    ctx.lineTo(cx, trackY)
    ctx.stroke()

    const vAtTime = v0 + a * time
    const arrowLen = Math.min(Math.abs(vAtTime) * 6, trackW * 0.4)
    if (arrowLen > 2) {
      const dir = Math.sign(vAtTime) || 1
      const tipX = Math.min(Math.max(cx + dir * arrowLen, left), w - right)
      drawArrow(ctx, cx, trackY - 26, tipX, trackY - 26, '#0ea5e9', 3)
    }

    const cartW = 30
    const cartH = 16
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.roundRect(cx - cartW / 2, trackY - cartH, cartW, cartH, 4)
    ctx.fill()
    ctx.fillStyle = '#1e293b'
    for (const wx of [cx - 8, cx + 8]) {
      ctx.beginPath()
      ctx.arc(wx, trackY, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={duration}
        heightClass="h-44"
      />
      {variant === 'velocity' ? (
        <PredictGauge
          label={cfg.label}
          unit={cfg.unit}
          max={gaugeMax}
          trueValue={trueValue}
          decimals={cfg.decimals}
          answered={answered}
          submittedValue={submittedValues ? submittedValues[0] : null}
          onSubmit={handleSubmit}
          orientation="horizontal"
        />
      ) : (
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
      )}
    </div>
  )
}
