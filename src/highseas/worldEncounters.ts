import { aimDelaySeconds, isInRange } from './combat'
import type { WorldPosition } from './navigation'
import { mulberry32, nextSeed } from './rng'
import type {
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
/** Normalized range at which an approaching contact forces an engagement. */
export const CONTACT_ENGAGE_RADIUS = 0.06
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
