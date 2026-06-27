import { Suspense, lazy, useState } from 'react'
import type { Step } from '../lessons/types'

const MoorStopGame3D = lazy(
  () => import('../components/interactive/MoorStopGame3D'),
)

const harnessStep: Step = {
  uid: 'dev-moor-stop',
  stepType: 'question',
  displayText: '',
  interactiveComponent: 'MoorStopGame3D',
  expected: [100],
  explanation: '',
  params: { v0: 20, a: 2, target: 100, tolerance: 5 },
}

export default function MoorStopHarness() {
  const [answered, setAnswered] = useState(false)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display mb-4 text-lg font-semibold text-slate-900">
        Dead in the Water (dev harness)
      </h1>
      <Suspense
        fallback={<div className="h-72 w-full animate-shimmer rounded-xl" />}
      >
        <MoorStopGame3D
          step={harnessStep}
          answered={answered}
          submittedValues={answered ? [100] : null}
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
