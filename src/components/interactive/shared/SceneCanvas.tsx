import { useEffect, useRef } from 'react'
import { useMotionPreference } from '../../../hooks/useMotionPreference'

/** Props for {@link SceneCanvas}. */
interface SceneCanvasProps {
  /**
   * Draws the scene. Receives the CSS pixel size and the current time `t`
   * (seconds): elapsed time when looping, animation progress for one-shots, or
   * the static time otherwise.
   */
  draw: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    t: number,
  ) => void
  /** Continuously animate (e.g. orbiting/oscillating scenes). */
  loop?: boolean
  /** Incrementing this plays a one-shot animation from 0 to `duration`. */
  playToken?: number
  /** One-shot animation duration in seconds. Defaults to 2. */
  duration?: number
  /** Time to render when neither looping nor playing (e.g. slider scrub). */
  staticT?: number
  /** Re-render when this value changes (for static, drag-driven scenes). */
  redrawKey?: unknown
  /** Tailwind height class for the canvas container. Defaults to h-56. */
  heightClass?: string
  /**
   * Representative time (seconds) to render as a single static frame when the
   * scene would otherwise `loop` but the user's motion preference is
   * `reduced`/`off`. Chosen so the scene looks complete rather than blank.
   * Defaults to 1.5.
   */
  reducedStaticT?: number
}

/**
 * A reusable animated Canvas surface. Handles devicePixelRatio scaling, resize,
 * and three render modes (looping, one-shot, static) so individual lesson
 * components only need to supply a `draw` callback. Rendering uses Canvas 2D
 * with requestAnimationFrame for smooth, accurate visuals.
 */
export function SceneCanvas({
  draw,
  loop = false,
  playToken = 0,
  duration = 2,
  staticT = 0,
  redrawKey,
  heightClass = 'h-56',
  reducedStaticT = 1.5,
}: SceneCanvasProps) {
  const { animationsEnabled } = useMotionPreference()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  const rafRef = useRef<number | null>(null)
  const lastTRef = useRef(0)

  useEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /** Renders one frame at time t (seconds), handling DPR + sizing. */
    function render(t: number) {
      if (!ctx || !canvas || !container) return
      lastTRef.current = t
      const dpr = window.devicePixelRatio || 1
      const w = container.clientWidth
      const h = container.clientHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      drawRef.current(ctx, w, h, t)
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (loop && animationsEnabled) {
      const start = performance.now()
      const tick = (now: number) => {
        render((now - start) / 1000)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } else if (loop) {
      // Reduced/off motion: skip the continuous rAF loop and show a single
      // representative frame so the decorative scene still looks complete.
      render(reducedStaticT)
    } else if (playToken > 0) {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - start) / 1000, duration)
        render(t)
        if (t < duration) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          rafRef.current = null
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    } else {
      render(staticT)
    }

    const observer = new ResizeObserver(() => render(lastTRef.current))
    observer.observe(container)

    return () => {
      observer.disconnect()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [loop, playToken, duration, staticT, redrawKey, animationsEnabled, reducedStaticT])

  return (
    <div
      ref={containerRef}
      className={`min-w-0 w-full ${heightClass} elev-1 overflow-hidden rounded-xl border border-slate-200`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
