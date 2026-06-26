import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import type { StepComponentProps } from './types'

/**
 * Maps a step's `interactiveComponent` name to a lazily-loaded React component.
 * Interactive modules are not bundled into the main chunk; each is imported on
 * demand when its step is rendered.
 */
export const interactiveRegistry: Record<
  string,
  LazyExoticComponent<ComponentType<StepComponentProps>>
> = {
  IntroDemo: lazy(() => import('../components/interactive/IntroDemo')),
  ThreeCannons: lazy(() => import('../components/interactive/ThreeCannons')),
  TwoPanelEquations: lazy(
    () => import('../components/interactive/TwoPanelEquations'),
  ),
  VectorDecomposition: lazy(
    () => import('../components/interactive/VectorDecomposition'),
  ),
  TimeOfFlight: lazy(() => import('../components/interactive/TimeOfFlight')),
  MaxHeightDragBar: lazy(
    () => import('../components/interactive/MaxHeightDragBar'),
  ),
  CliffLanding: lazy(() => import('../components/interactive/CliffLanding')),
  MotionTrackDemo: lazy(
    () => import('../components/interactive/MotionTrackDemo'),
  ),
  MotionQuestion: lazy(
    () => import('../components/interactive/MotionQuestion'),
  ),
  ForceSledDemo: lazy(() => import('../components/interactive/ForceSledDemo')),
  ForceQuestion: lazy(() => import('../components/interactive/ForceQuestion')),
  RampDemo: lazy(() => import('../components/interactive/RampDemo')),
  RampSpeedDemo: lazy(() => import('../components/interactive/RampSpeedDemo')),
  RampQuestion: lazy(() => import('../components/interactive/RampQuestion')),
  OrbitDemo: lazy(() => import('../components/interactive/OrbitDemo')),
  OrbitQuestion: lazy(() => import('../components/interactive/OrbitQuestion')),
  FreeBodyDemo: lazy(() => import('../components/interactive/FreeBodyDemo')),
  FreeBodyQuestion: lazy(
    () => import('../components/interactive/FreeBodyQuestion'),
  ),
  EquationReference: lazy(
    () => import('../components/interactive/EquationReference'),
  ),
  ConceptPretrieval: lazy(
    () => import('../components/interactive/ConceptPretrieval'),
  ),
}

/**
 * Resolves an interactive component by name.
 * @param name The step's interactiveComponent key.
 */
export function resolveInteractive(name: string) {
  return interactiveRegistry[name]
}
