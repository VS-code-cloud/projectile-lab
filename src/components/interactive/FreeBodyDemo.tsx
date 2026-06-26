import { useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
import { GRAVITY } from '../../physics/kinematics'
import type { StepComponentProps } from '../../lessons/types'

const PLAY_DURATION = 2

/**
 * Free-body diagram demonstration for a block on level ground. Two framings
 * driven by `step.variant`:
 * - `equilibrium`: the block sits still while weight (down) and the normal force
 *   (up) cancel, illustrating a balanced free-body diagram (ΣF = 0).
 * - `applied`: a slider adds a horizontal push; the block accelerates at
 *   a = F/m and the net force is highlighted (no friction in this lesson).
 * @param props.step Provides `variant`, `params.mass`, and optional
 * `params.applied` (initial push, N).
 */
export default function FreeBodyDemo({ step }: StepComponentProps) {
  const mass = step.params?.mass ?? 4
  const isApplied = step.variant === 'applied'
  const [applied, setApplied] = useState(
    isApplied ? (step.params?.applied ?? 12) : 0,
  )
  const [playToken, setPlayToken] = useState(0)

  const w = weightOf(mass)
  const accel = applied / mass

  const draw = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ) => {
    const floorY = height * 0.72
    const startX = 92

    // Ground line.
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, floorY)
    ctx.lineTo(width, floorY)
    ctx.stroke()
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, floorY, width, height - floorY)

    // Block travel (only the applied variant moves).
    const maxTravel = 0.5 * Math.max(accel, 0.01) * PLAY_DURATION * PLAY_DURATION
    const avail = width - startX - 80
    const xMeters = 0.5 * accel * time * time
    const px = isApplied
      ? startX + Math.min((xMeters / Math.max(maxTravel, 0.01)) * avail, avail)
      : width * 0.42

    const block = 40
    const cx = px
    const cy = floorY - block / 2

    ctx.fillStyle = '#4f46e5'
    ctx.beginPath()
    ctx.roundRect(cx - block / 2, floorY - block, block, block, 6)
    ctx.fill()
    drawLabel(ctx, `${mass} kg`, cx, cy, '#ffffff', 'center')

    // Scale newtons -> pixels so the weight arrow is a readable length.
    const scale = 46 / Math.max(w, 1)

    // Weight (down, gray).
    const wLen = w * scale
    drawArrow(ctx, cx, cy, cx, cy + wLen, '#94a3b8', 3)
    drawLabel(ctx, `W = ${w.toFixed(0)} N`, cx + 8, cy + wLen, '#64748b')

    // Normal force (up, green) — balances the weight on flat ground.
    drawArrow(ctx, cx, cy, cx, cy - wLen, '#059669', 3)
    drawLabel(ctx, `N = ${w.toFixed(0)} N`, cx + 8, cy - wLen, '#047857')

    // Applied force (right, blue) for the applied variant.
    if (isApplied && applied > 0) {
      const fLen = applied * scale
      drawArrow(ctx, cx, cy, cx + fLen, cy, '#1d4ed8', 3)
      drawLabel(ctx, `F = ${applied} N`, cx + fLen + 4, cy - 12, '#1e40af')
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={PLAY_DURATION}
        redrawKey={`${applied}-${mass}`}
        heightClass="h-56"
      />

      {isApplied ? (
        <>
          <div className="break-words rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">With no friction, the net force is the push:</span>{' '}
            <span className="num font-semibold text-slate-800">
              F_net = {applied} N, so a = F/m = {accel.toFixed(1)} m/s²
            </span>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Applied force: <span className="num">{applied} N</span>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={applied}
              onChange={(e) => setApplied(Number.parseFloat(e.target.value))}
              className="mt-1 w-full touch-manipulation"
            />
          </label>
          <button
            type="button"
            onClick={() => setPlayToken((token) => token + 1)}
            className="btn-ghost"
          >
            Push the block
          </button>
        </>
      ) : (
        <div className="break-words rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">Weight and the normal force cancel:</span>{' '}
          <span className="num font-semibold text-slate-800">
            ΣF (the summation of all forces) = 0, so the block stays at rest.
          </span>
        </div>
      )}
    </div>
  )
}

/** Weight of a mass (N) using the shared gravity constant. */
function weightOf(mass: number): number {
  return mass * GRAVITY
}
