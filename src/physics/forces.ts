/**
 * Newtonian force helpers for the Forces & Free-Body Diagrams lesson.
 *
 * Conventions:
 * - SI units: kilograms, newtons, m/s^2.
 * - For horizontal forces, positive points in the direction of intended motion;
 *   opposing forces are passed as negative values.
 * - Reuses the shared GRAVITY constant so weight stays consistent with the rest
 *   of the curriculum.
 */
import { GRAVITY } from './kinematics'

/**
 * Weight (gravitational force) on a mass near Earth's surface.
 * @param mass Mass in kilograms.
 */
export function weight(mass: number): number {
  return mass * GRAVITY
}

/**
 * Normal force on an object resting on flat, level ground. Equals the object's
 * weight plus any additional straight-down push (use a negative value for a
 * straight-up pull). The result is clamped at zero: once an upward pull exceeds
 * the weight the surface no longer pushes back.
 * @param mass Mass in kilograms.
 * @param appliedDownward Extra vertical force pressing the object down (N).
 *   Defaults to 0.
 */
export function normalForceFlat(mass: number, appliedDownward = 0): number {
  return Math.max(0, weight(mass) + appliedDownward)
}

/**
 * Net force from a set of forces acting along a single axis.
 * @param forces Signed force components (N).
 */
export function netForce(forces: number[]): number {
  return forces.reduce((sum, force) => sum + force, 0)
}

/**
 * Acceleration produced by a net force on a mass (Newton's second law).
 * @param net Net force (N).
 * @param mass Mass in kilograms.
 */
export function acceleration(net: number, mass: number): number {
  return net / mass
}
