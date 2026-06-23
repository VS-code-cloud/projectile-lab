import { useEffect, useState } from 'react'
import { CannonCanvas } from '../CannonCanvas'
import type { Shot } from '../CannonCanvas'

const SHOTS: Shot[] = [{ v: 28, thetaDeg: 45, color: '#4f46e5' }]

/**
 * Lesson intro demonstration. Plays a single sample arc to set the scene and
 * lists what the learner will be able to do by the end.
 */
export default function IntroDemo() {
  const [fireToken, setFireToken] = useState(0)

  useEffect(() => {
    const id = window.setTimeout(() => setFireToken(1), 300)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="space-y-4">
      <CannonCanvas shots={SHOTS} fireToken={fireToken} />
      <ul className="space-y-1 text-sm text-slate-600">
        <li>Decompose a launch velocity into horizontal and vertical parts.</li>
        <li>Apply your 1D equations to each direction independently.</li>
        <li>Predict flight time, maximum height, and landing distance.</li>
      </ul>
      <button
        type="button"
        onClick={() => setFireToken((t) => t + 1)}
        className="btn-primary"
      >
        Replay
      </button>
    </div>
  )
}
