import { Component, type ReactNode } from 'react'

interface Props {
  /** Rendered if the children throw (e.g. a glTF/HDRI failed to load/decode). */
  fallback: ReactNode
  children: ReactNode
}

interface State {
  failed: boolean
}

/**
 * Catches errors thrown while rendering the HD asset subtrees (a missing or
 * undecodable `.glb`/`.hdr`) and renders the procedural fallback instead, so a
 * bad asset can never blank the scene. Suspense handles the *loading* state;
 * this handles the *error* state.
 */
export class AssetErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.warn('[high-seas] HD asset failed, using procedural fallback:', error)
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
