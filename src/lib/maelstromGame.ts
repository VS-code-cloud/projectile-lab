import { evaluateBand, type BandResult } from './navalChallenge'

/** Centripetal acceleration a = v²/r (m/s²). */
export function centripetalAccel(v: number, r: number): number {
  return (v * v) / r
}

/** Orbital period T = 2πr/v (s). */
export function period(r: number, v: number): number {
  return (2 * Math.PI * r) / v
}

/** Centripetal force F = m·v²/r (N). */
export function centripetalForce(m: number, v: number, r: number): number {
  return (m * v * v) / r
}

/** Classify rowing speed by the centripetal acceleration it produces. */
export function evaluateOrbit(
  v: number,
  r: number,
  target: number,
  tolerance: number,
): BandResult {
  return evaluateBand(centripetalAccel(v, r), target, tolerance)
}
