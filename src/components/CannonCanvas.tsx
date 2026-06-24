import { useEffect, useRef } from 'react'
import { positionAt, timeToGround } from '../physics/kinematics'

/** A single projectile to render in the scene. */
export interface Shot {
  /** Initial speed (m/s). */
  v: number
  /** Launch angle from horizontal (degrees). */
  thetaDeg: number
  /** Launch height above ground (meters). Defaults to 0. */
  h0?: number
  /** Stroke color for the trajectory and ball. */
  color?: string
  /** Optional label drawn near the landing point. */
  label?: string
}

/** A point of interest annotated on the scene. */
export interface CanvasMarker {
  /** Horizontal position (meters). */
  x: number
  /** Vertical position (meters). */
  y: number
  /** Optional text label. */
  label?: string
  /** Marker color. */
  color?: string
}

/** Props for {@link CannonCanvas}. */
interface CannonCanvasProps {
  /** Trajectories to display once fired. */
  shots: Shot[]
  /** If set, draws a cliff of this height (m) with the cannon on top. */
  cliffHeight?: number
  /** Markers revealed after firing (e.g. max height, landing point). */
  markers?: CanvasMarker[]
  /** Dashed horizontal guide line at this height (m), e.g. a prediction. */
  guideHeight?: number
  /** Label for the horizontal guide line. */
  guideLabel?: string
  /** Dashed vertical guide line at this distance (m), e.g. a landing guess. */
  guideX?: number
  /** Label for the vertical guide line. */
  guideXLabel?: string
  /**
   * Animation trigger. While 0/undefined the scene shows only the cannon(s).
   * Incrementing it (re)plays the projectile animation.
   */
  fireToken?: number
  /** Tailwind height class for the canvas container. Defaults to h-64. */
  heightClass?: string
}

/** Sampled point along a trajectory. */
interface TrajPoint {
  t: number
  x: number
  y: number
}

/** Computed trajectory for a shot. */
interface Trajectory {
  shot: Shot
  totalTime: number
  points: TrajPoint[]
}

const SAMPLES = 160

/**
 * Samples a shot's trajectory from launch until it reaches the ground.
 * @param shot The projectile to sample.
 */
function sampleTrajectory(shot: Shot): Trajectory {
  const h0 = shot.h0 ?? 0
  const totalTime = Math.max(timeToGround(shot.v, shot.thetaDeg, h0), 0.0001)
  const points: TrajPoint[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (totalTime * i) / SAMPLES
    const p = positionAt(shot.v, shot.thetaDeg, t, h0)
    points.push({ t, x: p.x, y: Math.max(p.y, 0) })
  }
  return { shot, totalTime, points }
}

/**
 * Interactive canvas that draws a cannon scene and animates projectile arcs.
 * Physics come from the shared kinematics module, so every arc is accurate.
 * Rendering uses Canvas 2D with requestAnimationFrame for smooth playback.
 */
export function CannonCanvas({
  shots,
  cliffHeight = 0,
  markers = [],
  guideHeight,
  guideLabel,
  guideX,
  guideXLabel,
  fireToken = 0,
  heightClass = 'h-64',
}: CannonCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  /** Current animation progress in simulated seconds (global clock). */
  const simTimeRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const trajectories = shots.map(sampleTrajectory)
    const maxTime = trajectories.reduce((m, t) => Math.max(m, t.totalTime), 0.5)

    // World bounds (meters), padded so the scene never touches the edges.
    let xMin = 0
    let xMax = 1
    let yMax = Math.max(cliffHeight, guideHeight ?? 0, 1)
    for (const traj of trajectories) {
      for (const p of traj.points) {
        if (p.x < xMin) xMin = p.x
        if (p.x > xMax) xMax = p.x
        if (p.y > yMax) yMax = p.y
      }
    }
    for (const m of markers) {
      if (m.x > xMax) xMax = m.x
      if (m.y > yMax) yMax = m.y
    }
    if (guideX !== undefined && guideX > xMax) xMax = guideX
    if (cliffHeight > 0) xMin = Math.min(xMin, -0.12 * xMax)
    // Give vertical-only shots horizontal breathing room.
    if (xMax - xMin < 1e-3) {
      xMin = -yMax * 0.4
      xMax = yMax * 0.4
    }
    xMax *= 1.08
    yMax *= 1.12

    const marginL = 40
    const marginR = 16
    const marginT = 14
    const marginB = 30

    /** Renders the scene up to a given simulated time (or Infinity for full). */
    function render(simTime: number) {
      if (!ctx || !canvas || !container) return
      const dpr = window.devicePixelRatio || 1
      const cssW = container.clientWidth
      const cssH = container.clientHeight
      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr
        canvas.height = cssH * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)

      const plotW = cssW - marginL - marginR
      const plotH = cssH - marginT - marginB
      const sx = (x: number) =>
        marginL + ((x - xMin) / (xMax - xMin)) * plotW
      const sy = (y: number) => marginT + plotH - (y / yMax) * plotH

      /**
       * Draws label text with a soft white halo so it stays legible where it
       * overlaps the trajectory, grid, or other lines. Uses the caller's
       * current fillStyle, font, textAlign, and textBaseline.
       */
      const label = (text: string, x: number, y: number) => {
        if (!ctx) return
        ctx.save()
        ctx.lineWidth = 3
        ctx.lineJoin = 'round'
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)'
        ctx.strokeText(text, x, y)
        ctx.restore()
        ctx.fillText(text, x, y)
      }

      // Sky background.
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(marginL, marginT, plotW, plotH)

      // Faint graph grid for a physics / blueprint feel (~6 columns x 4 rows).
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let c = 1; c < 6; c++) {
        const gx = marginL + (plotW * c) / 6
        ctx.moveTo(gx, marginT)
        ctx.lineTo(gx, marginT + plotH)
      }
      for (let r = 1; r < 4; r++) {
        const gy = marginT + (plotH * r) / 4
        ctx.moveTo(marginL, gy)
        ctx.lineTo(marginL + plotW, gy)
      }
      ctx.stroke()

      // Ground.
      const groundY = sy(0)
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(marginL, groundY)
      ctx.lineTo(cssW - marginR, groundY)
      ctx.stroke()

      // Cliff block.
      if (cliffHeight > 0) {
        ctx.fillStyle = '#cbd5e1'
        ctx.fillRect(sx(xMin), sy(cliffHeight), sx(0) - sx(xMin), groundY - sy(cliffHeight))
      }

      // Axis ticks (distance + height extremes).
      ctx.fillStyle = '#64748b'
      ctx.font = '11px system-ui, sans-serif'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'right'
      label(`${Math.round(yMax)} m`, marginL - 4, sy(yMax))
      label('0', marginL - 4, groundY)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      label(`${Math.round(xMax)} m`, sx(xMax), groundY + 4)

      // Guide line (prediction).
      if (guideHeight !== undefined) {
        ctx.save()
        ctx.strokeStyle = '#9333ea'
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(marginL, sy(guideHeight))
        ctx.lineTo(cssW - marginR, sy(guideHeight))
        ctx.stroke()
        ctx.restore()
        ctx.fillStyle = '#9333ea'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'bottom'
        label(
          guideLabel ?? `${guideHeight.toFixed(0)} m`,
          marginL + 4,
          sy(guideHeight) - 2,
        )
      }

      // Vertical guide line (distance prediction).
      if (guideX !== undefined) {
        ctx.save()
        ctx.strokeStyle = '#9333ea'
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(sx(guideX), marginT)
        ctx.lineTo(sx(guideX), groundY)
        ctx.stroke()
        ctx.restore()
        ctx.fillStyle = '#9333ea'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        label(
          guideXLabel ?? `${guideX.toFixed(0)} m`,
          sx(guideX),
          marginT + 2,
        )
      }

      const launchY = cliffHeight > 0 ? cliffHeight : 0
      const scaleX = plotW / (xMax - xMin)
      const scaleY = plotH / yMax

      // Cannon (barrel + base) per shot, drawn at that shot's own launch point so
      // it sits exactly where the projectile starts (e.g. on a platform or cliff
      // top) rather than always on the ground. The barrel direction follows the
      // arc's launch tangent in the canvas's non-uniform screen scales.
      for (const traj of trajectories) {
        const shotLaunchY = traj.shot.h0 ?? launchY
        const angle = (traj.shot.thetaDeg * Math.PI) / 180
        const bx = sx(0)
        const by = sy(shotLaunchY)
        const dirX = Math.cos(angle) * scaleX
        const dirY = -Math.sin(angle) * scaleY
        const mag = Math.hypot(dirX, dirY) || 1
        const len = 22
        ctx.strokeStyle = traj.shot.color ?? '#1e293b'
        ctx.lineWidth = 5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + (dirX / mag) * len, by + (dirY / mag) * len)
        ctx.stroke()
        // Cannon base at the launch point.
        ctx.fillStyle = '#1e293b'
        ctx.beginPath()
        ctx.arc(bx, by, 6, 0, Math.PI * 2)
        ctx.fill()
      }

      const fired = (fireToken ?? 0) > 0
      if (fired) {
        for (const traj of trajectories) {
          const color = traj.shot.color ?? '#dc2626'
          const visibleTime = Math.min(simTime, traj.totalTime)
          ctx.strokeStyle = color
          ctx.lineWidth = 2.5
          ctx.beginPath()
          let started = false
          let ballX = sx(0)
          let ballY = sy(traj.shot.h0 ?? launchY)
          for (const p of traj.points) {
            if (p.t > visibleTime) break
            const px = sx(p.x)
            const py = sy(p.y)
            if (!started) {
              ctx.moveTo(px, py)
              started = true
            } else {
              ctx.lineTo(px, py)
            }
            ballX = px
            ballY = py
          }
          ctx.stroke()
          // Projectile ball at the current position.
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(ballX, ballY, 5, 0, Math.PI * 2)
          ctx.fill()
          // Landing label once the shot has finished.
          if (traj.shot.label && simTime >= traj.totalTime) {
            ctx.fillStyle = color
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            label(traj.shot.label, sx(traj.points[traj.points.length - 1].x), groundY - 6)
          }
        }

        // Markers revealed after firing.
        if (simTime >= maxTime) {
          for (const m of markers) {
            ctx.fillStyle = m.color ?? '#0f766e'
            ctx.beginPath()
            ctx.arc(sx(m.x), sy(m.y), 4, 0, Math.PI * 2)
            ctx.fill()
            if (m.label) {
              ctx.textAlign = 'left'
              ctx.textBaseline = 'middle'
              label(m.label, sx(m.x) + 6, sy(m.y))
            }
          }
        }
      }
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if ((fireToken ?? 0) > 0) {
      // Animate from t=0 across the global flight time.
      const durationMs = Math.min(Math.max(maxTime, 1.2), 3.5) * 1000
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1)
        simTimeRef.current = progress * maxTime
        render(simTimeRef.current)
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          rafRef.current = null
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    } else {
      simTimeRef.current = 0
      render(0)
    }

    // Keep the scene crisp on container resize.
    const observer = new ResizeObserver(() => {
      render(rafRef.current !== null ? simTimeRef.current : maxTime)
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [
    shots,
    cliffHeight,
    markers,
    guideHeight,
    guideLabel,
    guideX,
    guideXLabel,
    fireToken,
    heightClass,
  ])

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} overflow-hidden rounded-xl border border-slate-200`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
