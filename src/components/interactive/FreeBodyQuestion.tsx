import { useState } from 'react'
import { SceneCanvas } from './shared/SceneCanvas'
import { drawArrow, drawLabel, fitLabelFontSize } from './shared/draw'
import { NumericAnswer } from './shared/NumericAnswer'
import type { StepComponentProps } from '../../lessons/types'

/** Display config per asked quantity. */
const VARIANTS = {
  weight: {
    unit: 'N',
    label: 'Enter the block\u2019s weight.',
  },
  normal: {
    unit: 'N',
    label: 'Enter the normal force from the ground.',
  },
  netforce: {
    unit: 'N',
    label: 'Enter the net force on the block.',
  },
  accel: {
    unit: 'm/s\u00B2',
    label: 'Enter the block\u2019s acceleration.',
  },
} as const

type Variant = keyof typeof VARIANTS

/**
 * Question step for the Forces & Free-Body Diagrams lesson. Draws a labelled
 * free-body scene for the asked quantity (weight, normal force, net force, or
 * acceleration) and collects a single numeric answer. The scene is illustrative;
 * grading uses the step's `expected` value via the lesson engine.
 * @param props.step Provides `variant` and `params` (mass plus the relevant
 * forces for the scene labels).
 */
export default function FreeBodyQuestion({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const variant: Variant =
    step.variant === 'normal' ||
    step.variant === 'netforce' ||
    step.variant === 'accel'
      ? step.variant
      : 'weight'
  const cfg = VARIANTS[variant]

  const mass = step.params?.mass ?? 4
  const pushDown = step.params?.pushDown ?? 0
  const forceRight = step.params?.forceRight ?? 0
  const forceLeft = step.params?.forceLeft ?? 0
  const net = step.params?.net ?? forceRight - forceLeft

  const [playToken, setPlayToken] = useState(0)

  const draw = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => {
    const header = buildHeader(variant, {
      mass,
      pushDown,
      forceRight,
      forceLeft,
      net,
    })
    drawLabel(
      ctx,
      header,
      14,
      18,
      '#475569',
      'left',
      fitLabelFontSize(ctx, header, width - 28),
    )

    const floorY = height * 0.74
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, floorY)
    ctx.lineTo(width, floorY)
    ctx.stroke()
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, floorY, width, height - floorY)

    const block = 40
    const cx = width * 0.5
    const cy = floorY - block / 2
    ctx.fillStyle = '#4f46e5'
    ctx.beginPath()
    ctx.roundRect(cx - block / 2, floorY - block, block, block, 6)
    ctx.fill()
    drawLabel(ctx, `${mass} kg`, cx, cy, '#ffffff', 'center')

    if (variant === 'weight') {
      drawArrow(ctx, cx, cy, cx, cy + 54, '#94a3b8', 3)
      drawLabel(ctx, 'W = ?', cx + 8, cy + 54, '#64748b')
    } else if (variant === 'normal') {
      drawArrow(ctx, cx, cy, cx, cy + 46, '#94a3b8', 3)
      drawLabel(ctx, 'mg', cx + 8, cy + 46, '#64748b')
      if (pushDown > 0) {
        drawArrow(ctx, cx, cy - 64, cx, cy - 18, '#ea580c', 3)
        drawLabel(ctx, `push ${pushDown} N`, cx + 8, cy - 64, '#c2410c')
      }
      drawArrow(ctx, cx - 16, cy, cx - 16, cy - 50, '#059669', 3)
      drawLabel(ctx, 'N = ?', cx - 24, cy - 50, '#047857', 'right')
    } else if (variant === 'netforce') {
      if (forceRight > 0) {
        drawArrow(ctx, cx, cy, cx + 70, cy, '#1d4ed8', 3)
        drawLabel(ctx, `${forceRight} N`, cx + 74, cy - 12, '#1e40af')
      }
      if (forceLeft > 0) {
        drawArrow(ctx, cx, cy, cx - 70, cy, '#dc2626', 3)
        drawLabel(ctx, `${forceLeft} N`, cx - 74, cy - 12, '#b91c1c', 'right')
      }
    } else {
      // accel: show the net force driving the block.
      const dir = net >= 0 ? 1 : -1
      drawArrow(ctx, cx, cy, cx + dir * 72, cy, '#1d4ed8', 3)
      drawLabel(
        ctx,
        `F_net = ${Math.abs(net)} N`,
        cx + dir * 76,
        cy - 12,
        '#1e40af',
        dir >= 0 ? 'left' : 'right',
      )
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <SceneCanvas
        draw={draw}
        playToken={playToken}
        redrawKey={`${variant}-${mass}-${pushDown}-${forceRight}-${forceLeft}-${net}`}
        heightClass="h-48"
      />
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
    </div>
  )
}

/** Builds the scene header listing the givens for a variant. */
function buildHeader(
  variant: Variant,
  values: {
    mass: number
    pushDown: number
    forceRight: number
    forceLeft: number
    net: number
  },
): string {
  switch (variant) {
    case 'weight':
      return `m = ${values.mass} kg`
    case 'normal':
      return values.pushDown > 0
        ? `m = ${values.mass} kg    push = ${values.pushDown} N down`
        : `m = ${values.mass} kg`
    case 'netforce':
      return `right = ${values.forceRight} N    left = ${values.forceLeft} N`
    case 'accel':
      return `m = ${values.mass} kg    F_net = ${Math.abs(values.net)} N`
  }
}
