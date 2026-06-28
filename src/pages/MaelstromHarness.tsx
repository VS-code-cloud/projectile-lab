import { Suspense, lazy, useState } from 'react'
import type { Step } from '../lessons/types'

const MaelstromGame3D = lazy(
  () => import('../components/interactive/MaelstromGame3D'),
)

const harnessStep: Step = {
  uid: 'dev-maelstrom',
  stepType: 'question',
  displayText: '',
  interactiveComponent: 'MaelstromGame3D',
  expected: [20],
  explanation: '',
  params: { radius: 5, target: 20, tolerance: 2, mass: 50 },
}

export default function MaelstromHarness() {
  const [answered, setAnswered] = useState(false)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display mb-4 text-lg font-semibold text-slate-900">
        The Whirlpool (dev harness)
      </h1>
      <Suspense
        fallback={<div className="h-72 w-full animate-shimmer rounded-xl" />}
      >
        <MaelstromGame3D
          step={harnessStep}
          answered={answered}
          submittedValues={answered ? [20] : null}
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
