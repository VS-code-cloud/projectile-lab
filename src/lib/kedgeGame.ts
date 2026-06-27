import { evaluateBand, type BandResult } from './navalChallenge'

/** Signed sum of wind, current, and capstan haul (toward dock is positive). */
export function netForce(wind: number, current: number, haul: number): number {
  return wind + current + haul
}

/** Classifies the capstan haul by the net force it produces. */
export function evaluateKedge(
  haul: number,
  wind: number,
  current: number,
  targetNet: number,
  tolerance: number,
): BandResult {
  return evaluateBand(netForce(wind, current, haul), targetNet, tolerance)
}
