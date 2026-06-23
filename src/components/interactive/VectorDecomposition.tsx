import { useState } from 'react'
import type { StepComponentProps } from '../../lessons/types'

/**
 * Question step: decompose a launch velocity into horizontal and vertical
 * components. Shows a right-triangle diagram and collects vx and vy. One
 * submission only; the inputs lock once answered.
 * @param props.step Provides `params.v` and `params.theta` for the diagram.
 */
export default function VectorDecomposition({
  step,
  answered,
  submittedValues,
  onSubmit,
}: StepComponentProps) {
  const v = step.params?.v ?? 30
  const theta = step.params?.theta ?? 45
  const [vx, setVx] = useState(submittedValues ? String(submittedValues[0]) : '')
  const [vy, setVy] = useState(submittedValues ? String(submittedValues[1]) : '')

  /** Submits the two component values if both are valid numbers. */
  function handleSubmit() {
    const nx = Number.parseFloat(vx)
    const ny = Number.parseFloat(vy)
    if (Number.isNaN(nx) || Number.isNaN(ny)) return
    onSubmit([nx, ny])
  }

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 240 180" className="mx-auto h-44 w-full max-w-sm">
        <polygon
          points="40,150 200,150 200,30"
          fill="#eef2ff"
          stroke="#6366f1"
          strokeWidth="2"
        />
        <line x1="40" y1="150" x2="200" y2="30" stroke="#4f46e5" strokeWidth="2.5" />
        <text x="110" y="80" fill="#4f46e5" fontSize="13" fontWeight="600">
          v = {v}
        </text>
        <text x="115" y="167" fill="#0f766e" fontSize="13">
          vx = ?
        </text>
        <text x="205" y="95" fill="#b45309" fontSize="13">
          vy = ?
        </text>
        <text x="52" y="143" fill="#334155" fontSize="12">
          {theta}&deg;
        </text>
      </svg>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Horizontal vx (m/s)
          <input
            type="number"
            inputMode="decimal"
            value={vx}
            disabled={answered}
            onChange={(e) => setVx(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Vertical vy (m/s)
          <input
            type="number"
            inputMode="decimal"
            value={vy}
            disabled={answered}
            onChange={(e) => setVy(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          />
        </label>
      </div>

      {!answered && (
        <button
          type="button"
          onClick={handleSubmit}
          className="btn-primary"
        >
          Submit answer
        </button>
      )}
    </div>
  )
}
