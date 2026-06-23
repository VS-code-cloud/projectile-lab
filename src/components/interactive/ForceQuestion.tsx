import { useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
import { NumericAnswer } from './shared/NumericAnswer'
import type { StepComponentProps } from '../../lessons/types'

const PLAY_DURATION = 2

/**
 * Question step for Newton's second law. Renders a block with an applied force
 * and animates it (a = F/m, or a provided acceleration) once the learner
 * submits. Works for solving for a, F, or m depending on which params are set.
 * @param props.step Provides any two of `params.force`, `params.mass`, `params.accel`.
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

  const [playToken, setPlayToken] = useState(answered ? 1 : 0)

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
    const floorY = h * 0.72
    const startX = 70

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
    drawArrow(
      ctx,
      px - blockW / 2 - arrowLen,
      floorY - blockH / 2,
      px - blockW / 2 - 4,
      floorY - blockH / 2,
      '#1d4ed8',
      3,
    )
    if (force !== undefined) {
      drawLabel(
        ctx,
        `F = ${force} N`,
        px - blockW / 2 - arrowLen,
        floorY - blockH / 2 - 14,
        '#1e40af',
      )
    }
  }

  return (
    <div className="space-y-2">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={PLAY_DURATION}
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
