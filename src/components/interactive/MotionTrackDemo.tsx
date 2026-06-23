import { useMemo, useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Demonstration: a cart moving along a 1-D track. Scrub the time slider or press
 * Play to watch position evolve under constant velocity and/or acceleration
 * (x = v0·t + ½·a·t²). Velocity arrow length tracks the instantaneous speed.
 * @param props.step Provides `params.v0`, `params.a`, and `params.duration`.
 */
export default function MotionTrackDemo({ step }: StepComponentProps) {
  const v0 = step.params?.v0 ?? 4
  const a = step.params?.a ?? 0
  const duration = step.params?.duration ?? 4

  const [t, setT] = useState(0)
  const [playToken, setPlayToken] = useState(0)

  /** Displacement x at time tt (m). */
  const xAt = useMemo(
    () => (tt: number) => v0 * tt + 0.5 * a * tt * tt,
    [v0, a],
  )
  const xMax = Math.max(xAt(duration), 0.001)
  const vNow = v0 + a * t
  const xNow = xAt(t)

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

    // Track baseline + tick marks.
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(left, trackY)
    ctx.lineTo(w - right, trackY)
    ctx.stroke()
    ctx.lineWidth = 1
    const ticks = 5
    for (let i = 0; i <= ticks; i++) {
      const x = (xMax * i) / ticks
      const px = toPx(x)
      ctx.strokeStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.moveTo(px, trackY - 5)
      ctx.lineTo(px, trackY + 5)
      ctx.stroke()
      drawLabel(ctx, `${x.toFixed(0)}`, px, trackY + 16, '#94a3b8', 'center')
    }
    drawLabel(ctx, 'position (m)', left, trackY + 34, '#64748b')

    // Trail showing the path covered so far.
    const cx = toPx(xAt(time))
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.35)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(left, trackY)
    ctx.lineTo(cx, trackY)
    ctx.stroke()

    // Velocity arrow above the cart, scaled to current speed.
    const vAtTime = v0 + a * time
    const arrowLen = Math.min(Math.abs(vAtTime) * 6, trackW * 0.4)
    if (arrowLen > 2) {
      const dir = Math.sign(vAtTime) || 1
      drawArrow(
        ctx,
        cx,
        trackY - 26,
        cx + dir * arrowLen,
        trackY - 26,
        '#0ea5e9',
        3,
      )
      drawLabel(
        ctx,
        `v = ${vAtTime.toFixed(1)} m/s`,
        cx + dir * arrowLen + dir * 4,
        trackY - 38,
        '#0369a1',
        dir > 0 ? 'left' : 'right',
      )
    }

    // The cart.
    const cartW = 30
    const cartH = 16
    ctx.fillStyle = '#4f46e5'
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
    <div className="space-y-4">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        duration={duration}
        staticT={t}
        redrawKey={`${v0}-${a}-${t}`}
        heightClass="h-52"
      />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-slate-500">Position</span>{' '}
          <span className="num font-semibold text-slate-800">
            {xNow.toFixed(1)} m
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-slate-500">Velocity</span>{' '}
          <span className="num font-semibold text-slate-800">
            {vNow.toFixed(1)} m/s
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Time: <span className="num">{t.toFixed(1)} s</span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.05}
            value={t}
            onChange={(e) => setT(Number.parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setT(0)
            setPlayToken((token) => token + 1)
          }}
          className="btn-ghost"
        >
          Play motion
        </button>
      </div>
    </div>
  )
}
