import { useMemo, useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
import { NumericAnswer } from './shared/NumericAnswer'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Question step for 1-D motion. Shows the scenario cart, and animates it through
 * the motion (x = v0·t + ½·a·t²) once the learner submits a numeric answer.
 * @param props.step Provides `params.v0`, `params.a`, and `params.t`.
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

  const [playToken, setPlayToken] = useState(answered ? 1 : 0)

  const xAt = useMemo(
    () => (tt: number) => v0 * tt + 0.5 * a * tt * tt,
    [v0, a],
  )
  const xMax = Math.max(xAt(duration), 0.001)

  /** Plays the motion animation and records the answer. */
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
    const left = 44
    const right = 24
    const trackW = w - left - right
    const trackY = h * 0.62
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
      drawArrow(ctx, cx, trackY - 26, cx + dir * arrowLen, trackY - 26, '#0ea5e9', 3)
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
    <div className="space-y-2">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={duration}
        heightClass="h-44"
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
