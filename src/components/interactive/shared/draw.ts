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
