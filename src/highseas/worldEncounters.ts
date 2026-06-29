import { aimDelaySeconds, isInRange, maxRange } from './combat'
import { WORLD_DISTANCE_METERS, type WorldPosition } from './navigation'
import { mulberry32, nextSeed } from './rng'
import type {
  BoardingEncounter,
  NavyEncounter,
  OverboardEncounter,
  PirateEncounter,
  WhirlpoolEncounter,
} from './types'

/** Enemy hull hit points for a pirate duel (chipped down over a few rounds). */
export const ENEMY_HP_MAX = 100

/** Base sail/wind force (N) at stage 0; each upgrade adds 500 N. */
export const BASE_WIND_FORCE = 4000
/** Random wind variation (± N) applied to the base force each encounter. */
export const WIND_FORCE_VARIATION = 1000
/** Force added per ship upgrade stage. */
export const WIND_FORCE_PER_STAGE = 500
/** Acceleration (m/s²) the ship must reach to escape a navy pursuit. */
export const NAVY_ESCAPE_ACCEL = 7

/** Wind/sail force for a navy escape: base + per-stage bonus ± random variation. */
export function windForceFor(rand: () => number, stage: number): number {
  const base = BASE_WIND_FORCE + stage * WIND_FORCE_PER_STAGE
  return base + Math.round((rand() * 2 - 1) * WIND_FORCE_VARIATION)
}

export type ContactKind = 'pirate' | 'navy'

/** A visible ship contact in the open-world sea. */
export interface WorldContact {
  id: string
  kind: ContactKind
  x: number
  y: number
  /** Pirate cannon muzzle speed (m/s). */
  muzzleSpeed?: number
  /** Seconds the pirate waits before firing once in range. */
  aimDelay?: number
}

export interface PirateFiringState {
  distance: number
  inRange: boolean
  canFire: boolean
}

export const VISIBILITY_RADIUS = 0.35
export const CAPTURE_RADIUS = 0.04
export const OPEN_SEA_CONTACT_REFRESH_SECONDS = 15
export const OPEN_SEA_ENCOUNTER_INTERVAL_SECONDS = 20
const MIN_CONTACT_DISTANCE = 0.08
const TIME_BUCKET_SECONDS = OPEN_SEA_CONTACT_REFRESH_SECONDS

// Persistent-contact tuning. Contacts no longer despawn on a timer: they emerge
// from the fog a short sail away and steadily close on the player (chase), and
// only leave when the player fights them or moors. Chase speeds are normalized
// world units per second and sit *slightly above* the player's MAX_SAIL_SPEED
// (0.0035), so a straight-line flight can't shake them — you escape by mooring
// in a town or fighting — yet the margin is small enough that maneuvering still
// buys ground. Navy presses a touch harder than pirates.
export const PIRATE_CHASE_SPEED = 0.0038
export const NAVY_CHASE_SPEED = 0.004
/** Most enemy ships shadowing the player at once (kept modest so it never swarms). */
export const MAX_CONTACTS = 3
/** Seconds between spawning a fresh contact while below `MAX_CONTACTS`. */
export const CONTACT_SPAWN_INTERVAL_SECONDS = 15
// Normalized range at which an approaching contact forces an engagement. Set to
// ~650 m (0.108 × WORLD_DISTANCE_METERS 6000), matching the cannon's max reach
// at 80 m/s, so an enemy that has closed to within firing range engages — it is
// far easier to get into combat than the old 360 m.
export const CONTACT_ENGAGE_RADIUS = 0.108

// Chasers hold at a standoff range instead of overrunning the player. Pirates
// now press all the way in to BOARD: they close to ~45 m (just inside the 50 m
// boarding trigger) so the melee challenge fires on contact. Navy still stands
// off (~180 m) to threaten a jettison chase rather than grapple aboard. Both are
// normalized world units (× WORLD_DISTANCE_METERS).
export const PIRATE_STANDOFF_RADIUS = 0.0075
export const NAVY_STANDOFF_RADIUS = 0.03

/** A pirate that closes within this many meters grapples on and boards. */
export const BOARDING_METERS = 50
/** Boarding trigger range in normalized world units (BOARDING_METERS / world). */
export const BOARDING_RADIUS = BOARDING_METERS / WORLD_DISTANCE_METERS
/**
 * A navy ship that closes within this many meters forces a pursuit (the jettison
 * escape). Much larger than the boarding range, so the navy commits to the chase
 * well before it could ever board — pirate combat triggers are unaffected.
 */
export const NAVY_PURSUIT_METERS = 300

/** Normalized range a chaser of `kind` holds at instead of overrunning the player. */
export function contactStandoffRadius(kind: ContactKind): number {
  return kind === 'navy' ? NAVY_STANDOFF_RADIUS : PIRATE_STANDOFF_RADIUS
}
// Fresh contacts spawn in a tight band just *past* the fog horizon. The open-sea
// scene fogs out around 0.124 normalized (FOG_FAR 34000 / WORLD 275000), so a
// ship spawned in [0.135, 0.19] is hidden in the haze yet only a short sail
// away — it emerges plausibly out of the fog rather than popping in across an
// empty sea or right on top of the player.
export const CONTACT_SPAWN_MIN_DISTANCE = 0.135
export const CONTACT_SPAWN_MAX_DISTANCE = 0.19

/** Normalized world units a contact of `kind` closes on the player per second. */
export function contactChaseSpeed(kind: ContactKind): number {
  return kind === 'navy' ? NAVY_CHASE_SPEED : PIRATE_CHASE_SPEED
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * Spawns a single fresh contact just past the fog horizon around the player, so
 * it emerges from the haze a short sail away and then closes in. Deterministic
 * in `seed` (which also makes the contact id stable/unique per spawn).
 */
export function spawnContact(
  seed: number,
  kind: ContactKind,
  playerPos: WorldPosition,
): WorldContact {
  const rand = mulberry32(seed >>> 0)
  const angle = rand() * Math.PI * 2
  const dist =
    CONTACT_SPAWN_MIN_DISTANCE +
    rand() * (CONTACT_SPAWN_MAX_DISTANCE - CONTACT_SPAWN_MIN_DISTANCE)
  const x = clamp01(playerPos.x + Math.cos(angle) * dist)
  const y = clamp01(playerPos.y + Math.sin(angle) * dist)
  if (kind === 'pirate') {
    return {
      id: `pirate-${seed >>> 0}`,
      kind,
      x,
      y,
      muzzleSpeed: randInt(rand, 28, 34),
      aimDelay: aimDelaySeconds(rand()),
    }
  }
  return { id: `navy-${seed >>> 0}`, kind, x, y }
}

function randInt(rand: () => number, min: number, max: number): number {
  return Math.round(min + rand() * (max - min))
}

export function elapsedBucket(
  elapsedSeconds: number,
  bucketSeconds = OPEN_SEA_CONTACT_REFRESH_SECONDS,
): number {
  return Math.floor(elapsedSeconds / bucketSeconds)
}

function bucketSeed(seed: number, stage: number, elapsedSeconds: number): number {
  const bucket = elapsedBucket(elapsedSeconds, TIME_BUCKET_SECONDS)
  return (seed ^ (stage * 997) ^ (bucket * 7919)) >>> 0
}

export function shouldRefreshOpenSeaContacts(
  previousElapsedSeconds: number,
  nextElapsedSeconds: number,
): boolean {
  return elapsedBucket(previousElapsedSeconds) !== elapsedBucket(nextElapsedSeconds)
}

export function shouldTriggerOpenSeaEncounter(
  previousElapsedSeconds: number,
  nextElapsedSeconds: number,
): boolean {
  return (
    elapsedBucket(previousElapsedSeconds, OPEN_SEA_ENCOUNTER_INTERVAL_SECONDS) !==
    elapsedBucket(nextElapsedSeconds, OPEN_SEA_ENCOUNTER_INTERVAL_SECONDS)
  )
}

export function contactDistance(
  playerPos: WorldPosition,
  contact: WorldContact,
): number {
  return Math.hypot(contact.x - playerPos.x, contact.y - playerPos.y)
}

/**
 * Produces deterministic visible contacts from voyage seed, upgrade stage,
 * player position, and elapsed sailing time (bucketed every 15 s).
 */
export function generateVisibleContacts(
  seed: number,
  stage: number,
  playerPos: WorldPosition,
  elapsedSeconds: number,
): WorldContact[] {
  const bucket = elapsedBucket(elapsedSeconds, TIME_BUCKET_SECONDS)
  let s = bucketSeed(seed, stage, elapsedSeconds)
  const rand = mulberry32(s)
  const count = 1 + Math.floor(rand() * 2)
  const contacts: WorldContact[] = []

  for (let i = 0; i < count; i++) {
    s = nextSeed(s)
    const contactRand = mulberry32(s)
    const kind: ContactKind = contactRand() < 0.55 ? 'pirate' : 'navy'
    const angle = contactRand() * Math.PI * 2
    const dist =
      MIN_CONTACT_DISTANCE +
      contactRand() * (VISIBILITY_RADIUS - MIN_CONTACT_DISTANCE)
    const x = Math.max(0, Math.min(1, playerPos.x + Math.cos(angle) * dist))
    const y = Math.max(0, Math.min(1, playerPos.y + Math.sin(angle) * dist))

    if (kind === 'pirate') {
      contacts.push({
        id: `${kind}-${bucket}-${i}`,
        kind,
        x,
        y,
        muzzleSpeed: randInt(contactRand, 28, 34),
        aimDelay: aimDelaySeconds(contactRand()),
      })
    } else {
      contacts.push({
        id: `${kind}-${bucket}-${i}`,
        kind,
        x,
        y,
      })
    }
  }

  return contacts
}

export function buildNavyEncounter(rand: () => number, stage: number): NavyEncounter {
  return {
    kind: 'navy',
    force: windForceFor(rand, stage),
    escapeAccel: NAVY_ESCAPE_ACCEL,
    tolerance: randInt(rand, 30, 50),
    damage: randInt(rand, 20, 35),
  }
}

export function buildPirateEncounter({
  distance,
  muzzleSpeed,
  aimDelay,
  rand,
}: {
  distance: number
  muzzleSpeed: number
  aimDelay: number
  rand: () => number
}): PirateEncounter {
  return {
    kind: 'pirate',
    distance,
    muzzleSpeed,
    tolerance: randInt(rand, 6, 10),
    loot: randInt(rand, 6, 12),
    damage: randInt(rand, 15, 30),
    aimDelay,
    enemyHpMax: ENEMY_HP_MAX,
  }
}

// Curated rope-swing setups whose centripetal answer v = √(a·r) is an exact
// integer, so boarding phase 2 always has a clean solution. Radii read as real
// boarding ropes (4–8 m); `accel` is what the fraying rope can bear before it
// snaps and drops the boarder into the sea.
const ROPE_SWINGS: ReadonlyArray<{ radius: number; accel: number }> = [
  { radius: 4, accel: 9 }, // v = 6
  { radius: 4, accel: 16 }, // v = 8
  { radius: 4, accel: 25 }, // v = 10
  { radius: 5, accel: 20 }, // v = 10
  { radius: 6, accel: 6 }, // v = 6
  { radius: 6, accel: 24 }, // v = 12
  { radius: 8, accel: 8 }, // v = 8
  { radius: 8, accel: 18 }, // v = 12
]

/**
 * A pirate boarding party: a three-phase melee. Phase 1 throws a powder grenade
 * onto the boarding party (2D projectile), phase 2 cuts a rope-swinging boarder
 * loose (uniform circular motion), and phase 3 shoves off the grappled hull
 * after looting (Newton's 2nd law). Generated so every phase has a clean,
 * solvable answer inside the mini-games' input ranges. Loot beats firing (a >1
 * multiplier on the same base roll); a percentage hull hit is guaranteed and
 * grows with each phase missed.
 */
export function buildBoardingEncounter(
  rand: () => number,
  stage: number,
): BoardingEncounter {
  // Phase 1 — grenade: even throw speed (clean), target well inside max range so
  // the required launch angle 0.5·asin(g·d/v²) is always solvable.
  const grenadeSpeed = 2 * randInt(rand, 9, 12) // 18..24 m/s
  const reach = maxRange(grenadeSpeed)
  const grenadeDistance = Math.round(reach * (0.3 + rand() * 0.4)) // 30–70% of reach
  // Phase 2 — rope swing: an exact-integer-answer setup.
  const swing =
    ROPE_SWINGS[Math.min(ROPE_SWINGS.length - 1, Math.floor(rand() * ROPE_SWINGS.length))]
  // Phase 3 — shove off: ship-scale mass (×100) and a gentle separation accel so
  // F = m·a lands on a tidy few-thousand-newton target.
  const pirateShipMass = randInt(rand, 60, 120) * 100 // 6000..12000 kg
  const separationAccel = randInt(rand, 1, 3) / 2 // 0.5, 1.0, or 1.5 m/s²
  return {
    kind: 'boarding',
    grenadeDistance,
    grenadeSpeed,
    grenadeTolerance: randInt(rand, 6, 10),
    ropeRadius: swing.radius,
    ropeBreakAccel: swing.accel,
    ropeTolerance: 2,
    pirateShipMass,
    separationAccel,
    shoveTolerance: randInt(rand, 200, 400),
    baseLoot: randInt(rand, 6, 12),
    lootMultiplierPct: randInt(rand, 150, 210),
    hullDamagePct: randInt(rand, 12, 18),
    // Fumbling a phase hurts: a hefty extra hull hit per miss (scaling with
    // ship tier) so botching the melee can genuinely cost the voyage.
    missDamage: 12 + stage * 4,
  }
}

/**
 * A "crew overboard" rescue: cut the sails so the ship coasts to a stop right at
 * the swimmer (the 1D kinematics challenge). Generated so the stopping distance
 * v0²/(2a) is a clean value comfortably inside the game's 0–400 m input range.
 */
export function buildOverboardEncounter(
  rand: () => number,
  stage: number,
): OverboardEncounter {
  // Even v0 with integer deceleration keeps target = v0²/(2a) a whole number.
  const v0 = 2 * randInt(rand, 4, 8) // 8..16 m/s
  const a = randInt(rand, 1, 2) // 1 or 2 m/s²
  return {
    kind: 'overboard',
    v0,
    a,
    tolerance: randInt(rand, 4, 8),
    reward: randInt(rand, 8, 14) + stage * 2,
  }
}

/**
 * A whirlpool the ship is caught in: hold the speed whose centripetal
 * acceleration v²/r matches what the hull can bear (the uniform-circular-motion
 * challenge). Generated so the answer speed √(a·r) stays inside the 1–40 m/s
 * input range. Failing it damages the hull but never sinks the ship.
 */
export function buildWhirlpoolEncounter(
  rand: () => number,
  stage: number,
): WhirlpoolEncounter {
  const radius = randInt(rand, 20, 60) // m
  const targetAccel = randInt(rand, 2, 8) // m/s²
  return {
    kind: 'whirlpool',
    radius,
    targetAccel,
    tolerance: randInt(rand, 1, 2),
    damage: randInt(rand, 16, 26) + stage,
  }
}

/** An open-sea event with no enemy ship: a rescue or a whirlpool hazard. */
export type EnvironmentalEncounter = OverboardEncounter | WhirlpoolEncounter

/** Rolls one of the two environmental (non-combat) open-sea encounters. */
export function buildEnvironmentalEncounter(
  rand: () => number,
  stage: number,
): EnvironmentalEncounter {
  return rand() < 0.5
    ? buildOverboardEncounter(rand, stage)
    : buildWhirlpoolEncounter(rand, stage)
}

/** Evaluates whether a pirate is in cannon range and firing is unlocked. */
export function pirateFiringState(
  distance: number,
  muzzleSpeed: number,
  elapsedSinceInRange: number,
  aimDelay: number,
): PirateFiringState {
  const inRange = isInRange(distance, muzzleSpeed)
  return {
    distance,
    inRange,
    canFire: inRange && elapsedSinceInRange >= aimDelay,
  }
}

/** True when a navy ship has closed within capture radius. */
export function isNavyCaptureReady(
  distance: number,
  captureRadius = CAPTURE_RADIUS,
): boolean {
  return distance <= captureRadius
}
