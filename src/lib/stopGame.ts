import { evaluateBand, type BandResult } from './navalChallenge'

/** Coasting (stopping) distance with final speed 0: x = v₀²/(2a). */
export function coastingDistance(v0: number, a: number): number {
  return (v0 * v0) / (2 * a)
}

/** Classifies the learner's coasting-distance guess against the true glide. */
export function evaluateStop(
  input: number,
  v0: number,
  a: number,
  tolerance: number,
): BandResult {
  return evaluateBand(input, coastingDistance(v0, a), tolerance)
}
