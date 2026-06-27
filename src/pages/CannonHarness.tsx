import { Suspense, lazy, useState } from 'react'
import type { Step } from '../lessons/types'

// Dev-only test harness: mounts the cannon mini-game in isolation (no auth, no
// lesson progression) so the 3D UX can be exercised directly and by browser/MCP
// tests. Routed only when import.meta.env.DEV is true.
const CannonGame3D = lazy(
  () => import('../components/interactive/CannonGame3D'),
)

const harnessStep: Step = {
  uid: 'dev-cannon',
  stepType: 'question',
  displayText: '',
  interactiveComponent: 'CannonGame3D',
  expected: [500],
  explanation: '',
  params: { v: 80, target: 500, tolerance: 5 },
}

export default function CannonHarness() {
  const [answered, setAnswered] = useState(false)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display mb-4 text-lg font-semibold text-slate-900">
        Cannon mini-game (dev harness)
      </h1>
      <Suspense
        fallback={<div className="h-72 w-full animate-shimmer rounded-xl" />}
      >
        <CannonGame3D
          step={harnessStep}
          answered={answered}
          submittedValues={answered ? [500] : null}
          isCorrect={answered ? true : null}
          onSubmit={() => setAnswered(true)}
        />
      </Suspense>
      <p className="mt-4 text-xs text-slate-500">
        Solved: {answered ? 'yes' : 'no'}
      </p>
    </main>
  )
}
