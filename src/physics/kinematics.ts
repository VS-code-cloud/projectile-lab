/**
 * Physically accurate 2D projectile kinematics.
 *
 * Conventions:
 * - x is horizontal (positive to the right), y is vertical (positive up).
 * - Launch point is the origin unless an initial height (h0) is supplied.
 * - Angles are measured from the horizontal, in degrees.
 * - SI units: meters, seconds, m/s, m/s^2.
 */

/** Gravitational acceleration magnitude (m/s^2). */
export const GRAVITY = 9.8

/** Velocity components resulting from decomposing a launch velocity. */
export interface VelocityComponents {
  /** Horizontal velocity component (m/s). */
  vx: number
  /** Vertical velocity component (m/s). */
  vy: number
}

/** A 2D point in the projectile's coordinate space (meters). */
export interface Point2D {
  x: number
  y: number
}

/**
 * Converts an angle in degrees to radians.
 * @param deg Angle in degrees.
 */
function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Decomposes a launch velocity into horizontal and vertical components.
 * @param v Initial speed (m/s).
 * @param thetaDeg Launch angle from horizontal (degrees).
 */
export function decompose(v: number, thetaDeg: number): VelocityComponents {
  const theta = toRadians(thetaDeg)
  return {
    vx: v * Math.cos(theta),
    vy: v * Math.sin(theta),
  }
}

/**
 * Time for a projectile to return to its launch elevation (flat ground).
 * Derived from the vertical equation 0 = vy*t - 0.5*g*t^2.
 * @param v Initial speed (m/s).
 * @param thetaDeg Launch angle from horizontal (degrees).
 */
export function timeToReturn(v: number, thetaDeg: number): number {
  const { vy } = decompose(v, thetaDeg)
  return (2 * vy) / GRAVITY
}

/**
 * Maximum height reached above the launch elevation.
 * Derived as vy^2 / (2*g).
 * @param v Initial speed (m/s).
 * @param thetaDeg Launch angle from horizontal (degrees).
 */
export function maxHeight(v: number, thetaDeg: number): number {
  const { vy } = decompose(v, thetaDeg)
  return (vy * vy) / (2 * GRAVITY)
}

/**
 * Horizontal range over flat ground (lands at launch elevation).
 * Equivalent to v^2 * sin(2*theta) / g.
 * @param v Initial speed (m/s).
 * @param thetaDeg Launch angle from horizontal (degrees).
 */
export function rangeFlat(v: number, thetaDeg: number): number {
  const { vx } = decompose(v, thetaDeg)
  return vx * timeToReturn(v, thetaDeg)
}

/**
 * Total time of flight until the projectile reaches y = 0 ground level when
 * launched from an initial height h0. Solves 0 = h0 + vy*t - 0.5*g*t^2 for the
 * positive root.
 * @param v Initial speed (m/s).
 * @param thetaDeg Launch angle from horizontal (degrees).
 * @param h0 Launch height above the ground (meters).
 */
export function timeToGround(v: number, thetaDeg: number, h0: number): number {
  const { vy } = decompose(v, thetaDeg)
  // 0.5*g*t^2 - vy*t - h0 = 0  ->  a=0.5g, b=-vy, c=-h0
  const a = 0.5 * GRAVITY
  const b = -vy
  const c = -h0
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return 0
  return (-b + Math.sqrt(discriminant)) / (2 * a)
}

/**
 * Horizontal landing distance from a launch height h0 (projectile off a cliff).
 * @param v Initial speed (m/s).
 * @param thetaDeg Launch angle from horizontal (degrees).
 * @param h0 Launch height above the ground (meters).
 */
export function landingFromHeight(
  v: number,
  thetaDeg: number,
  h0: number,
): number {
  const { vx } = decompose(v, thetaDeg)
  return vx * timeToGround(v, thetaDeg, h0)
}

/**
 * Position of the projectile at time t, relative to the launch point plus h0.
 * @param v Initial speed (m/s).
 * @param thetaDeg Launch angle from horizontal (degrees).
 * @param t Elapsed time since launch (seconds).
 * @param h0 Launch height above the ground (meters). Defaults to 0.
 */
export function positionAt(
  v: number,
  thetaDeg: number,
  t: number,
  h0 = 0,
): Point2D {
  const { vx, vy } = decompose(v, thetaDeg)
  return {
    x: vx * t,
    y: h0 + vy * t - 0.5 * GRAVITY * t * t,
  }
}
