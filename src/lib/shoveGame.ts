import { evaluateBand, type BandResult } from './navalChallenge'

/** Push force needed to drive a mass to a target acceleration: F = m·a (N). */
export function forceToAccelerate(mass: number, accel: number): number {
  return mass * accel
}

/** Acceleration a push force produces on a mass: a = F/m (m/s²). */
export function shoveAccel(force: number, mass: number): number {
  return force / mass
}

/**
 * Classifies a push force by whether it reaches the separation force m·a needed
 * to shove the grappled pirate hull off at the target acceleration. Mirrors the
 * other naval evaluators (band classification around `mass * accelReq`).
 */
export function evaluateShove(
  force: number,
  mass: number,
  accelReq: number,
  tolerance: number,
): BandResult {
  return evaluateBand(force, mass * accelReq, tolerance)
}
