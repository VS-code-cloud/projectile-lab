import { rangeFlat } from '../physics/kinematics'

/** Whether a shot landed before, inside, or beyond the target zone. */
export type ShotStatus = 'short' | 'hit' | 'far'

export interface ShotResult {
  /** Horizontal landing distance over flat ground (m). */
  distance: number
  /** Where the landing fell relative to the target zone. */
  status: ShotStatus
}

/** Landing distance for a flat-ground shot at the given speed and angle. */
export function shotDistance(v: number, angleDeg: number): number {
  return rangeFlat(v, angleDeg)
}

/**
 * Classifies a landing distance against the target zone
 * `[target - tolerance, target + tolerance]` (bounds inclusive).
 */
export function classifyDistance(
  distance: number,
  target: number,
  tolerance: number,
): ShotStatus {
  if (distance < target - tolerance) return 'short'
  if (distance > target + tolerance) return 'far'
  return 'hit'
}

/** Evaluates a shot end to end: landing distance plus its zone classification. */
export function evaluateShot(
  v: number,
  angleDeg: number,
  target: number,
  tolerance: number,
): ShotResult {
  const distance = shotDistance(v, angleDeg)
  return { distance, status: classifyDistance(distance, target, tolerance) }
}
