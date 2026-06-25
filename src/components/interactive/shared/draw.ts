/**
 * Canvas drawing helpers shared by interactive lesson components.
 */

/**
 * Draws an arrow (line with a filled head) between two points.
 * @param ctx Canvas 2D context.
 * @param x1 Tail x (px).
 * @param y1 Tail y (px).
 * @param x2 Head x (px).
 * @param y2 Head y (px).
 * @param color Stroke/fill color.
 * @param width Line width (px). Defaults to 2.
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2,
): void {
  const head = 7
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  // Only draw a head if the arrow has meaningful length.
  if (Math.hypot(x2 - x1, y2 - y1) < 2) return
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - head * Math.cos(angle - Math.PI / 6),
    y2 - head * Math.sin(angle - Math.PI / 6),
  )
  ctx.lineTo(
    x2 - head * Math.cos(angle + Math.PI / 6),
    y2 - head * Math.sin(angle + Math.PI / 6),
  )
  ctx.closePath()
  ctx.fill()
}

/**
 * Draws a small text label at a position.
 * @param ctx Canvas 2D context.
 * @param text Label text.
 * @param x X position (px).
 * @param y Y position (px).
 * @param color Text color.
 * @param align Horizontal alignment. Defaults to 'left'.
 */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  align: CanvasTextAlign = 'left',
): void {
  ctx.fillStyle = color
  ctx.font = '12px ui-monospace, monospace'
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

/** Options for {@link drawThemedBackdrop}. */
export interface ThemedBackdropOptions {
  /** Accent color (rgb/hex without alpha) for the vignette ring. Defaults to brand indigo. */
  accent?: string
  /** Inset of the ring from the canvas edges (px). Defaults to 0. */
  inset?: number
  /** Corner radius of the ring (px). Defaults to 12. */
  radius?: number
  /** Peak opacity of the edge vignette (0–1). Defaults to 0.1. */
  intensity?: number
}

/**
 * Draws a subtle, themed atmosphere *around the edges* of a canvas: a soft
 * corner vignette plus a faint accent ring. It intentionally keeps the centre
 * fully transparent so the simulation stays on its light, legible surface —
 * this is decorative chrome, not a background fill. Purely additive: existing
 * components are unaffected unless they opt in by calling it (typically first,
 * before drawing the scene, or last, for a top vignette).
 *
 * @param ctx Canvas 2D context (expects DPR transform already applied).
 * @param w CSS pixel width of the canvas.
 * @param h CSS pixel height of the canvas.
 * @param opts Optional appearance overrides.
 */
export function drawThemedBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: ThemedBackdropOptions = {},
): void {
  const { accent = '99, 102, 241', inset = 0, radius = 12, intensity = 0.1 } = opts
  const x = inset
  const y = inset
  const rw = Math.max(0, w - inset * 2)
  const rh = Math.max(0, h - inset * 2)
  if (rw <= 0 || rh <= 0) return
  const r = Math.min(radius, rw / 2, rh / 2)

  const roundedRect = () => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + rw, y, x + rw, y + rh, r)
    ctx.arcTo(x + rw, y + rh, x, y + rh, r)
    ctx.arcTo(x, y + rh, x, y, r)
    ctx.arcTo(x, y, x + rw, y, r)
    ctx.closePath()
  }

  ctx.save()
  // Soft corner vignette — darkens only the extreme edges, leaving the centre clear.
  const grad = ctx.createRadialGradient(
    x + rw / 2,
    y + rh / 2,
    Math.min(rw, rh) * 0.35,
    x + rw / 2,
    y + rh / 2,
    Math.max(rw, rh) * 0.62,
  )
  grad.addColorStop(0, 'rgba(15, 23, 42, 0)')
  grad.addColorStop(1, `rgba(15, 23, 42, ${intensity})`)
  roundedRect()
  ctx.fillStyle = grad
  ctx.fill()

  // Faint accent ring for a branded frame.
  roundedRect()
  ctx.lineWidth = 1
  ctx.strokeStyle = `rgba(${accent}, ${Math.min(1, intensity * 2.2)})`
  ctx.stroke()
  ctx.restore()
}
