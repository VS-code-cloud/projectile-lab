import { useEffect, useMemo, useRef, useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel } from './shared/draw'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Demonstration: a cart moving along a 1-D track. Pressing Play animates the
 * motion from the beginning (x = v0·t + ½·a·t²); the velocity arrow length
 * tracks the instantaneous speed.
 * @param props.step Provides `params.v0`, `params.a`, and `params.duration`.
 */
export default function MotionTrackDemo({ step }: StepComponentProps) {
  const v0 = step.params?.v0 ?? 4
  const a = step.params?.a ?? 0
  const duration = step.params?.duration ?? 4

  const [t, setT] = useState(0)
  // Incrementing this (re)starts the animation from the beginning.
  const [playToken, setPlayToken] = useState(0)
  // Loop guard and current frame id, mutated synchronously by the handlers so a
  // scrub stops the animation immediately (no race with a pending frame).
  const playingRef = useRef(false)
  const rafIdRef = useRef<number | null>(null)

  /** Cancels any pending animation frame and stops the loop. */
  function stopLoop() {
    playingRef.current = false
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }

  // Animation loop: advances `t` from 0 to duration. Driven here (not in the
  // canvas) so the slider thumb and numeric readouts stay synchronized.
  useEffect(() => {
    if (playToken === 0) return
    let startTime: number | null = null
    const tick = (now: number) => {
      if (!playingRef.current) return
      if (startTime === null) startTime = now
      const elapsed = (now - startTime) / 1000
      if (elapsed >= duration) {
        playingRef.current = false
        rafIdRef.current = null
        setT(duration)
        return
      }
      setT(elapsed)
      rafIdRef.current = requestAnimationFrame(tick)
    }
    rafIdRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [playToken, duration])

  /** Starts (or restarts) the animation from the beginning. */
  function play() {
    stopLoop()
    playingRef.current = true
    setT(0)
    setPlayToken((token) => token + 1)
  }

  /** Displacement x at time tt (m). */
  const xAt = useMemo(
    () => (tt: number) => v0 * tt + 0.5 * a * tt * tt,
    [v0, a],
  )
  const xMax = Math.max(xAt(duration), 0.001)

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

    // Velocity arrow above the cart, scaled to current speed. Both the arrow
    // tip and the label are clamped so they never clip the canvas edges.
    const vAtTime = v0 + a * time
    const arrowLen = Math.min(Math.abs(vAtTime) * 6, trackW * 0.4)
    if (arrowLen > 2) {
      const dir = Math.sign(vAtTime) || 1
      const tipX = Math.max(left, Math.min(cx + dir * arrowLen, w - 8))
      drawArrow(ctx, cx, trackY - 26, tipX, trackY - 26, '#0ea5e9', 3)
      const labelX = Math.max(left + 40, Math.min(cx, w - right - 40))
      drawLabel(
        ctx,
        `v = ${vAtTime.toFixed(1)} m/s`,
        labelX,
        trackY - 40,
        '#0369a1',
        'center',
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
    <div className="min-w-0 space-y-4">
      <SceneCanvas
        draw={draw}
        staticT={t}
        redrawKey={`${v0}-${a}-${t}`}
        heightClass="h-52"
      />
      <button type="button" onClick={play} className="btn-ghost">
        Play motion
      </button>
    </div>
  )
}
