import type { Town } from './types'

/** Normalized map position in [0, 1] (x = west→east, y = north→south). */
export interface WorldPosition {
  x: number
  y: number
}

/** Arrow-key-like steering input for open-world sailing. */
export interface ShipInput {
  up?: boolean
  down?: boolean
  left?: boolean
  right?: boolean
}

export const WORLD_MIN = 0
export const WORLD_MAX = 1
export const TOWN_HARBOR_RADIUS = 0.08
export const TURN_RATE_DEG = 120
export const WORLD_DISTANCE_METERS = 6000
// The ship traverses the normalized world this many times slower than its
// *displayed* speed implies. Distances and combat keep WORLD_DISTANCE_METERS,
// but the sail-speed constants below are divided by this factor while the HUD
// multiplies it back (see `displayedSpeedMetersPerSecond`). The on-screen knots
// are therefore unchanged from the original tuning, yet the world takes ~10x
// longer to cross — so islands and the open sea feel far larger.
export const WORLD_SCALE_FACTOR = 10
export const DEFAULT_SAIL_SPEED = 0
export const MAX_SAIL_SPEED = 0.035 / WORLD_SCALE_FACTOR
export const MIN_SAIL_SPEED = -0.012 / WORLD_SCALE_FACTOR
// Acceleration and drag are deliberately gentle: the ship keeps the same top
// speed but takes several seconds to wind up to it and to coast back down, so
// the helm feels like a heavy sailing vessel with real momentum rather than an
// arcade kart. (Top speed ÷ accel ≈ 6 s to reach full throttle.)
export const SAIL_ACCEL = 0.006 / WORLD_SCALE_FACTOR
export const SAIL_DRAG = 0.004 / WORLD_SCALE_FACTOR
export const AUTONAV_SPEED = 0.12

export function distance(a: WorldPosition, b: WorldPosition): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function normalizedDistanceToMeters(normalizedDistance: number): number {
  return normalizedDistance * WORLD_DISTANCE_METERS
}

export function distanceMeters(a: WorldPosition, b: WorldPosition): number {
  return normalizedDistanceToMeters(distance(a, b))
}

/**
 * Speed to show the player (m/s). The ship physically moves WORLD_SCALE_FACTOR×
 * slower than this implies, so the displayed value matches the original tuning
 * even though the world now takes ~10× longer to cross (it feels much larger).
 */
export function displayedSpeedMetersPerSecond(normalizedSpeed: number): number {
  return Math.abs(normalizedSpeed) * WORLD_DISTANCE_METERS * WORLD_SCALE_FACTOR
}

export function distanceToTown(pos: WorldPosition, town: Town): number {
  return distance(pos, { x: town.x, y: town.y })
}

/**
 * Step `from` toward `target` by at most `maxStep` (normalized world units). If
 * the remaining distance is within one step the position snaps to `target` (no
 * overshoot/jitter). Used to make enemy contacts steadily close on the player.
 */
export function approachPosition(
  from: WorldPosition,
  target: WorldPosition,
  maxStep: number,
): WorldPosition {
  const dx = target.x - from.x
  const dy = target.y - from.y
  const d = Math.hypot(dx, dy)
  if (d <= maxStep || d === 0) return { x: target.x, y: target.y }
  return { x: from.x + (dx / d) * maxStep, y: from.y + (dy / d) * maxStep }
}

/**
 * Step `from` toward `target` by at most `maxStep`, but stop once it reaches
 * `standoff` units away — a chaser that holds at firing distance instead of
 * sailing onto the player. If `from` is already at or inside the standoff ring
 * it holds position (never pushes back out), and it never crosses the ring.
 */
export function approachToStandoff(
  from: WorldPosition,
  target: WorldPosition,
  maxStep: number,
  standoff: number,
): WorldPosition {
  const dx = target.x - from.x
  const dy = target.y - from.y
  const d = Math.hypot(dx, dy)
  if (d <= standoff || d === 0) return { x: from.x, y: from.y }
  const step = Math.min(maxStep, d - standoff)
  return { x: from.x + (dx / d) * step, y: from.y + (dy / d) * step }
}

export function clampPosition(pos: WorldPosition): WorldPosition {
  return {
    x: Math.max(WORLD_MIN, Math.min(WORLD_MAX, pos.x)),
    y: Math.max(WORLD_MIN, Math.min(WORLD_MAX, pos.y)),
  }
}

export function mapPositionPercent(pos: WorldPosition): { left: number; top: number } {
  const clamped = clampPosition(pos)
  return {
    left: clamped.x * 100,
    top: clamped.y * 100,
  }
}

export function isInTownRadius(
  pos: WorldPosition,
  town: Town,
  radius = TOWN_HARBOR_RADIUS,
): boolean {
  return distanceToTown(pos, town) <= radius
}

export function findTownAtPosition(
  pos: WorldPosition,
  towns: Town[],
  radius = TOWN_HARBOR_RADIUS,
): Town | null {
  let nearest: Town | null = null
  let nearestDist = radius
  for (const town of towns) {
    const d = distanceToTown(pos, town)
    if (d <= nearestDist) {
      nearest = town
      nearestDist = d
    }
  }
  return nearest
}

/**
 * Soft island collision: if `pos` lies inside `radius` of a town center, push it
 * back out to that town's shoreline (the nearest point on the circle). Towns are
 * far apart, so a position can intrude on at most one island. Returns the
 * corrected position and whether a collision happened, so the caller can bleed
 * off speed for a gentle bump rather than a hard wall.
 */
export function resolveIslandCollision(
  pos: WorldPosition,
  towns: Town[],
  radius: number,
): { position: WorldPosition; collided: boolean } {
  for (const town of towns) {
    const dx = pos.x - town.x
    const dy = pos.y - town.y
    const d = Math.hypot(dx, dy)
    if (d < radius) {
      if (d === 0) {
        return { position: { x: town.x + radius, y: town.y }, collided: true }
      }
      return {
        position: {
          x: town.x + (dx / d) * radius,
          y: town.y + (dy / d) * radius,
        },
        collided: true,
      }
    }
  }
  return { position: pos, collided: false }
}

/** Heading in degrees: 0 = east, increases clockwise (south = 90°). */
export function headingFromInput(
  currentHeadingDeg: number,
  input: ShipInput,
  deltaSeconds: number,
  turnRateDeg = TURN_RATE_DEG,
): number {
  let heading = currentHeadingDeg
  if (input.left) heading -= turnRateDeg * deltaSeconds
  if (input.right) heading += turnRateDeg * deltaSeconds
  return heading
}

export function headingToMovementVector(headingDeg: number): WorldPosition {
  const rad = (headingDeg * Math.PI) / 180
  return {
    x: Math.cos(rad),
    y: Math.sin(rad),
  }
}

/** Converts navigation heading to the Three.js Y rotation for a model whose bow is local +z. */
export function headingToRenderRotationDeg(headingDeg: number): number {
  return 90 - headingDeg
}

/** Converts a Three.js Y rotation for a local +z bow back to navigation heading degrees. */
export function renderRotationToHeadingDeg(renderRotationDeg: number): number {
  return 90 - renderRotationDeg
}

export function moveByHeading(
  pos: WorldPosition,
  headingDeg: number,
  speed: number,
  deltaSeconds: number,
): WorldPosition {
  const vector = headingToMovementVector(headingDeg)
  return clampPosition({
    x: pos.x + vector.x * speed * deltaSeconds,
    y: pos.y + vector.y * speed * deltaSeconds,
  })
}

function approachZero(value: number, amount: number): number {
  if (value > 0) return Math.max(0, value - amount)
  if (value < 0) return Math.min(0, value + amount)
  return 0
}

export function applyShipControls(
  pos: WorldPosition,
  headingDeg: number,
  speed: number,
  input: ShipInput,
  deltaSeconds: number,
): { position: WorldPosition; headingDeg: number; speed: number } {
  const newHeading = headingFromInput(headingDeg, input, deltaSeconds)
  let newSpeed = speed
  if (input.up) {
    newSpeed = Math.min(MAX_SAIL_SPEED, speed + SAIL_ACCEL * deltaSeconds)
  }
  if (input.down) {
    newSpeed = Math.max(MIN_SAIL_SPEED, newSpeed - SAIL_ACCEL * deltaSeconds)
  }
  if (!input.up && !input.down) {
    newSpeed = approachZero(newSpeed, SAIL_DRAG * deltaSeconds)
  }
  const position = moveByHeading(pos, newHeading, newSpeed, deltaSeconds)
  return { position, headingDeg: newHeading, speed: newSpeed }
}

export function advanceAutonavProgress(
  progress: number,
  from: WorldPosition,
  to: WorldPosition,
  deltaSeconds: number,
  speed = AUTONAV_SPEED,
): number {
  const len = distance(from, to)
  if (len === 0) return 1
  return Math.min(1, progress + (speed * deltaSeconds) / len)
}

export function autonavPosition(
  from: WorldPosition,
  to: WorldPosition,
  progress: number,
): WorldPosition {
  const t = Math.max(0, Math.min(1, progress))
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  }
}
