import type { ReactNode } from 'react'
import ShaderBackdrop from './ShaderBackdrop'

/** Props for {@link ImmersiveBackground}. */
interface ImmersiveBackgroundProps {
  /** Page content rendered above the backdrop layers. */
  children: ReactNode
  /** Extra classes for the root container. */
  className?: string
  /** Extra classes for the content layer (e.g. flex centering). */
  contentClassName?: string
}

/**
 * Shared full-page backdrop matching the login screen: a deep immersive gradient
 * with a faint dark grid overlay and the WebGL aurora shader behind the content.
 * Content sits in a relatively-positioned layer so it paints above the
 * negative-z shader (the same structure the login page uses). No `overflow`
 * clipping is applied so sticky headers inside still work.
 */
export function ImmersiveBackground({
  children,
  className = '',
  contentClassName = '',
}: ImmersiveBackgroundProps) {
  return (
    <div className={`bg-immersive relative min-h-svh ${className}`}>
      <div className="bg-grid-dark absolute inset-0 opacity-40" aria-hidden="true" />
      <ShaderBackdrop />
      <div className={`relative ${contentClassName}`}>{children}</div>
    </div>
  )
}
