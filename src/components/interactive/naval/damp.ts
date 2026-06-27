import * as THREE from 'three'

/**
 * Frame-rate-independent critically-damped move of `current` toward `target`.
 * `k` is the responsiveness (higher snaps faster); `delta` is the frame time.
 * Mutates `current` in place.
 */
export function dampVec3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  k: number,
  delta: number,
): void {
  const alpha = 1 - Math.exp(-k * Math.min(delta, 0.05))
  current.lerp(target, alpha)
}
