import { Suspense } from 'react'
import { resolveInteractive } from '../lessons/registry'
import type { StepComponentProps } from '../lessons/types'

/**
 * Resolves the interactive component referenced by a step's
 * `interactiveComponent` key and renders it lazily. This intentionally selects
 * a component at runtime from the registry (the data-driven lesson design), so
 * the static-components lint rule is disabled for the dynamic element below.
 */
export function InteractiveStep(props: StepComponentProps) {
  const Component = resolveInteractive(props.step.interactiveComponent)

  if (!Component) {
    return (
      <p className="text-sm text-red-600">
        Unknown interactive component: {props.step.interactiveComponent}
      </p>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="py-10 text-center text-sm text-slate-400">
          Loading interactive...
        </div>
      }
    >
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Component {...props} />
    </Suspense>
  )
}
