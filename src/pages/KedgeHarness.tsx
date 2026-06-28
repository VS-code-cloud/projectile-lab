import { Suspense, lazy, useState } from 'react'
import type { Step } from '../lessons/types'

const KedgeGame3D = lazy(
  () => import('../components/interactive/KedgeGame3D'),
)

const harnessStep: Step = {
  uid: 'dev-kedge',
  stepType: 'question',
  displayText: '',
  interactiveComponent: 'KedgeGame3D',
  expected: [60],
  explanation: '',
  params: {
    windForce: -300,
    currentForce: 120,
    targetNet: 60,
    tolerance: 20,
    target: 60,
  },
}

export default function KedgeHarness() {
  const [answered, setAnswered] = useState(false)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display mb-4 text-lg font-semibold text-slate-900">
        Pull into the Dock (dev harness)
      </h1>
      <Suspense
        fallback={<div className="h-72 w-full animate-shimmer rounded-xl" />}
      >
        <KedgeGame3D
          step={harnessStep}
          answered={answered}
          submittedValues={answered ? [60] : null}
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
