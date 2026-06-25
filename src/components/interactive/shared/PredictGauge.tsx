import { useRef, useState } from 'react'

/** Orientation of the drag track. */
export type GaugeOrientation = 'vertical' | 'horizontal'

/** Props for {@link PredictGauge}. */
interface PredictGaugeProps {
  /** Prompt shown above the prediction readout. */
  label: string
  /** Unit suffix for the readouts (e.g. "m/s"). */
  unit: string
  /** Top of the gauge scale. */
  max: number
  /** Correct value, revealed after submitting. */
  trueValue: number
  /** Decimal places for display and drag snapping. */
  decimals: number
  /** True once the prediction is submitted (locks the gauge, reveals the answer). */
  answered: boolean
  /** Previously submitted prediction, used to restore on revisit. */
  submittedValue: number | null
  /** Called with the predicted value when the learner locks it in. */
  onSubmit: (value: number) => void
  /** Track direction. Defaults to vertical. */
  orientation?: GaugeOrientation
}

/**
 * A drag-to-predict gauge shared by question steps. The learner drags the thumb
 * to estimate a quantity and locks it in; the gauge then reveals the true value
 * beside their guess. The chosen value is the graded answer, so this turns every
 * question into an active "predict, then check" moment. The track can be
 * vertical (default) or horizontal.
 *
 * The thumb starts at 30% of scale (never on the answer) so a deliberate drag is
 * always required before the prediction can be correct.
 */
export function PredictGauge({
  label,
  unit,
  max,
  trueValue,
  decimals,
  answered,
  submittedValue,
  onSubmit,
  orientation = 'vertical',
}: PredictGaugeProps) {
  const horizontal = orientation === 'horizontal'
  const factor = 10 ** decimals
  const round = (x: number) => Math.round(x * factor) / factor
  const [predicted, setPredicted] = useState(
    submittedValue ?? round(max * 0.3),
  )
  const trackRef = useRef<HTMLDivElement>(null)

  /** Maps a pointer position to a snapped prediction value along the track. */
  function updateFromPointer(clientX: number, clientY: number) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const ratio = horizontal
      ? (clientX - rect.left) / rect.width
      : (rect.bottom - clientY) / rect.height
    setPredicted(round(Math.min(Math.max(ratio, 0), 1) * max))
  }

  const guessPct = Math.min(Math.max((predicted / max) * 100, 0), 100)
  const truePct = Math.min(Math.max((trueValue / max) * 100, 0), 100)

  const sliderProps = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (answered) return
      e.currentTarget.setPointerCapture(e.pointerId)
      updateFromPointer(e.clientX, e.clientY)
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (answered || e.buttons === 0) return
      updateFromPointer(e.clientX, e.clientY)
    },
    role: 'slider' as const,
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': round(max),
    'aria-valuenow': predicted,
    'aria-disabled': answered,
  }

  const prediction = (
    <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
      Your prediction:{' '}
      <span className="num">{predicted.toFixed(decimals)}</span> {unit}
    </div>
  )
  const answer = answered && (
    <div className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-accent-600">
      Actual answer:{' '}
      <span className="num">{trueValue.toFixed(decimals)}</span> {unit}
    </div>
  )
  const submit = !answered && (
    <button
      type="button"
      onClick={() => onSubmit(predicted)}
      className="btn-primary self-start"
    >
      Lock in prediction
    </button>
  )

  if (horizontal) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {prediction}
        {answer}
        <div className="mt-1 flex items-center gap-3">
          <span className="num text-xs text-slate-400">0</span>
          <div
            ref={trackRef}
            {...sliderProps}
            className="relative h-10 flex-1 cursor-ew-resize touch-none rounded-full bg-slate-200 shadow-inner"
          >
            <div
              className="absolute left-0 h-full rounded-full bg-brand-500"
              style={{ width: `${guessPct}%` }}
            />
            <div
              className="absolute top-1/2 h-12 w-1.5 -translate-y-1/2 rounded-full bg-brand-700"
              style={{ left: `calc(${guessPct}% - 3px)` }}
            />
            {answered && (
              <div
                className="absolute top-1/2 h-16 w-0.5 -translate-y-1/2 rounded-full bg-accent-600"
                style={{ left: `calc(${truePct}% - 1px)` }}
              />
            )}
          </div>
          <span className="num text-xs text-slate-400">{round(max)}</span>
        </div>
        {submit}
      </div>
    )
  }

  return (
    <div className="flex items-stretch gap-4">
      <div className="flex flex-col items-center">
        <span className="num mb-1 text-xs text-slate-400">{round(max)}</span>
        <div
          ref={trackRef}
          {...sliderProps}
          className="relative h-52 w-10 cursor-ns-resize touch-none rounded-full bg-slate-200 shadow-inner"
        >
          <div
            className="absolute bottom-0 w-full rounded-full bg-brand-500"
            style={{ height: `${guessPct}%` }}
          />
          <div
            className="absolute left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-brand-700"
            style={{ bottom: `calc(${guessPct}% - 3px)` }}
          />
          {answered && (
            <div
              className="absolute left-1/2 h-0.5 w-16 -translate-x-1/2 rounded-full bg-accent-600"
              style={{ bottom: `calc(${truePct}% - 1px)` }}
            />
          )}
        </div>
        <span className="num mt-1 text-xs text-slate-400">0</span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {prediction}
        {answer}
        {submit}
      </div>
    </div>
  )
}
