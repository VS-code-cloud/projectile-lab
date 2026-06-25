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
    <div className="relative rounded-2xl border border-brand-100 bg-brand-50/40 p-2 elev-1">
      {/* Soft accent halo framing the interactive area. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-brand-300/30 bg-halo"
      />
      <div className="relative rounded-xl">
        <Suspense
          fallback={
            <div className="space-y-3 p-1">
              <div className="h-56 w-full animate-shimmer rounded-xl border border-slate-200" />
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                <span className="h-2 w-2 animate-shimmer rounded-full" />
                Loading interactive…
              </div>
            </div>
          }
        >
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Component {...props} />
        </Suspense>
      </div>
    </div>
  )
}
