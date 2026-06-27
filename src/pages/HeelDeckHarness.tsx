import { Suspense, lazy, useState } from 'react'
import type { Step } from '../lessons/types'

const HeelDeckGame3D = lazy(
  () => import('../components/interactive/HeelDeckGame3D'),
)

const harnessStep: Step = {
  uid: 'dev-heel-deck',
  stepType: 'question',
  displayText: '',
  interactiveComponent: 'HeelDeckGame3D',
  expected: [7],
  explanation: '',
  params: { length: 5, target: 7, tolerance: 0.4 },
}

export default function HeelDeckHarness() {
  const [answered, setAnswered] = useState(false)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display mb-4 text-lg font-semibold text-slate-900">
        The Heeling Deck (dev harness)
      </h1>
      <Suspense
        fallback={<div className="h-72 w-full animate-shimmer rounded-xl" />}
      >
        <HeelDeckGame3D
          step={harnessStep}
          answered={answered}
          submittedValues={answered ? [7] : null}
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
