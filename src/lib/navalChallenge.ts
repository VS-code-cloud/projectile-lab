/**
 * Shared scoring for the naval "final challenge" mini-games. Every challenge
 * reduces to a single computed value (a distance, mass, force, speed, or
 * acceleration) that must land inside a tolerance band around a target.
 */

/** Where a computed value fell relative to the target band. */
export type BandStatus = 'short' | 'hit' | 'far'

/** A computed value together with its band classification. */
export interface BandResult {
  /** The value produced by the challenge's physics. */
  value: number
  /** Where the value fell relative to `[target - tolerance, target + tolerance]`. */
  status: BandStatus
}

/**
 * Classifies a value against the band `[target - tolerance, target + tolerance]`
 * (bounds inclusive): below is `short`, above is `far`, inside is `hit`.
 */
export function classifyBand(
  value: number,
  target: number,
  tolerance: number,
): BandStatus {
  if (value < target - tolerance) return 'short'
  if (value > target + tolerance) return 'far'
  return 'hit'
}

/** Packages a value with its band classification. */
export function evaluateBand(
  value: number,
  target: number,
  tolerance: number,
): BandResult {
  return { value, status: classifyBand(value, target, tolerance) }
}
