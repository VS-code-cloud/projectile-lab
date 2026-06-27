import { GRAVITY } from '../physics/kinematics'
import { evaluateBand, type BandResult } from './navalChallenge'

/** Acceleration down a frictionless ramp heeled at `thetaDeg` (m/s²). */
export function rampAccel(thetaDeg: number): number {
  return GRAVITY * Math.sin((thetaDeg * Math.PI) / 180)
}

/** Speed at the bottom of a ramp of length `length` (m) after sliding from rest. */
export function arrivalSpeed(thetaDeg: number, length: number): number {
  return Math.sqrt(2 * rampAccel(thetaDeg) * length)
}

/** Classifies the learner's heel angle by the ball's arrival speed at the gun port. */
export function evaluateHeel(
  thetaDeg: number,
  length: number,
  target: number,
  tolerance: number,
): BandResult {
  return evaluateBand(arrivalSpeed(thetaDeg, length), target, tolerance)
}
