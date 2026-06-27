import { evaluateBand, type BandResult } from './navalChallenge'

/** Required mass to keep for the given force and target acceleration: m = F/a. */
export function keepMass(force: number, accelReq: number): number {
  return force / accelReq
}

/** Acceleration from force and kept mass: a = F/m. */
export function resultingAccel(force: number, mass: number): number {
  return force / mass
}

/** Classifies the kept mass against the required keep mass for escape. */
export function evaluateJettison(
  keep: number,
  force: number,
  accelReq: number,
  tolerance: number,
): BandResult {
  return evaluateBand(keep, force / accelReq, tolerance)
}
