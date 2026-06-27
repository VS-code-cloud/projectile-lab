import { Suspense, lazy, useState } from 'react'
import type { Step } from '../lessons/types'

const JettisonGame3D = lazy(
  () => import('../components/interactive/JettisonGame3D'),
)

const harnessStep: Step = {
  uid: 'dev-jettison',
  stepType: 'question',
  displayText: '',
  interactiveComponent: 'JettisonGame3D',
  expected: [800],
  explanation: '',
  params: {
    force: 4000,
    accelReq: 5,
    ladenMass: 1200,
    target: 800,
    tolerance: 40,
  },
}

export default function JettisonHarness() {
  const [answered, setAnswered] = useState(false)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display mb-4 text-lg font-semibold text-slate-900">
        Lighten the Ship (dev harness)
      </h1>
      <Suspense
        fallback={<div className="h-72 w-full animate-shimmer rounded-xl" />}
      >
        <JettisonGame3D
          step={harnessStep}
          answered={answered}
          submittedValues={answered ? [800] : null}
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
