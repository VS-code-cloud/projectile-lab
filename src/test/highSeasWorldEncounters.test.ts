import { describe, expect, it } from 'vitest'
import { maxRange } from '../highseas/combat'
import {
  buildEnvironmentalEncounter,
  buildNavyEncounter,
  buildOverboardEncounter,
  buildPirateEncounter,
  buildWhirlpoolEncounter,
  BOARDING_RADIUS,
  CAPTURE_RADIUS,
  contactChaseSpeed,
  contactDistance,
  contactStandoffRadius,
  CONTACT_ENGAGE_RADIUS,
  CONTACT_SPAWN_MAX_DISTANCE,
  CONTACT_SPAWN_MIN_DISTANCE,
  elapsedBucket,
  ENEMY_HP_MAX,
  generateVisibleContacts,
  isNavyCaptureReady,
  NAVY_CHASE_SPEED,
  NAVY_STANDOFF_RADIUS,
  OPEN_SEA_CONTACT_REFRESH_SECONDS,
  OPEN_SEA_ENCOUNTER_INTERVAL_SECONDS,
  PIRATE_CHASE_SPEED,
  PIRATE_STANDOFF_RADIUS,
  pirateFiringState,
  shouldRefreshOpenSeaContacts,
  shouldTriggerOpenSeaEncounter,
  spawnContact,
  type WorldContact,
} from '../highseas/worldEncounters'
import { MAX_SAIL_SPEED } from '../highseas/navigation'
import { mulberry32 } from '../highseas/rng'

const PLAYER = { x: 0.4, y: 0.5 }

describe('generateVisibleContacts', () => {
  it('is deterministic for the same seed, stage, position, and elapsed time', () => {
    const a = generateVisibleContacts(4242, 1, PLAYER, 30)
    const b = generateVisibleContacts(4242, 1, PLAYER, 30)
    expect(a).toEqual(b)
  })

  it('changes when seed, stage, or elapsed bucket changes', () => {
    const base = generateVisibleContacts(4242, 1, PLAYER, 30)
    const otherSeed = generateVisibleContacts(9999, 1, PLAYER, 30)
    const otherStage = generateVisibleContacts(4242, 2, PLAYER, 30)
    const otherTime = generateVisibleContacts(4242, 1, PLAYER, 45)
    expect(otherSeed).not.toEqual(base)
    expect(otherStage).not.toEqual(base)
    expect(otherTime).not.toEqual(base)
  })

  it('returns contacts within visibility and assigns pirate or navy kinds', () => {
    const contacts = generateVisibleContacts(777, 0, PLAYER, 20)
    expect(contacts.length).toBeGreaterThan(0)
    for (const c of contacts) {
      expect(['pirate', 'navy']).toContain(c.kind)
      expect(c.id).toMatch(/^(pirate|navy)-/)
      const dist = contactDistance(PLAYER, c)
      expect(dist).toBeGreaterThan(0)
      expect(dist).toBeLessThanOrEqual(0.35)
      if (c.kind === 'pirate') {
        expect(c.muzzleSpeed).toBeGreaterThanOrEqual(28)
        expect(c.muzzleSpeed).toBeLessThanOrEqual(34)
        expect(c.aimDelay).toBeGreaterThanOrEqual(0.5)
        expect(c.aimDelay).toBeLessThanOrEqual(2)
      }
    }
  })
})

describe('open-sea cadence helpers', () => {
  it('uses bucketed time for deterministic contact refreshes', () => {
    expect(OPEN_SEA_CONTACT_REFRESH_SECONDS).toBe(15)
    expect(elapsedBucket(14.9)).toBe(0)
    expect(elapsedBucket(15)).toBe(1)
    expect(shouldRefreshOpenSeaContacts(10, 14.9)).toBe(false)
    expect(shouldRefreshOpenSeaContacts(14.9, 15)).toBe(true)
  })

  it('triggers open-sea encounters at a separate fixed cadence', () => {
    expect(OPEN_SEA_ENCOUNTER_INTERVAL_SECONDS).toBe(20)
    expect(shouldTriggerOpenSeaEncounter(18, 19.9)).toBe(false)
    expect(shouldTriggerOpenSeaEncounter(19.9, 20)).toBe(true)
  })
})

describe('buildNavyEncounter', () => {
  it('creates a navy-only Newton challenge encounter from ship stage', () => {
    const encounter = buildNavyEncounter(() => 0.5, 2)
    expect(encounter.kind).toBe('navy')
    expect(encounter.force).toBeGreaterThan(0)
    expect(encounter.escapeAccel).toBeGreaterThanOrEqual(4)
    expect(encounter.escapeAccel).toBeLessThanOrEqual(7)
  })
})

describe('buildPirateEncounter', () => {
  it('gives the enemy a full hull for the duel', () => {
    const encounter = buildPirateEncounter({
      distance: 200,
      muzzleSpeed: 30,
      aimDelay: 0,
      rand: mulberry32(7),
    })
    expect(encounter.enemyHpMax).toBe(ENEMY_HP_MAX)
  })
})

describe('buildOverboardEncounter (1D kinematics)', () => {
  it('always produces a stopping distance inside the 0–400 m input range', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const e = buildOverboardEncounter(mulberry32(seed), seed % 4)
      const target = Math.round((e.v0 * e.v0) / (2 * e.a))
      expect(e.kind).toBe('overboard')
      expect(target).toBeGreaterThan(0)
      expect(target).toBeLessThanOrEqual(400)
      expect(e.reward).toBeGreaterThan(0)
    }
  })
})

describe('buildWhirlpoolEncounter (uniform circular motion)', () => {
  it('always produces a hold speed inside the 1–40 m/s input range', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const e = buildWhirlpoolEncounter(mulberry32(seed), seed % 4)
      const speed = Math.round(Math.sqrt(e.targetAccel * e.radius))
      expect(e.kind).toBe('whirlpool')
      expect(speed).toBeGreaterThan(0)
      expect(speed).toBeLessThanOrEqual(40)
      expect(e.damage).toBeGreaterThan(0)
    }
  })
})

describe('buildEnvironmentalEncounter', () => {
  it('rolls only non-combat overboard or whirlpool encounters', () => {
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      kinds.add(buildEnvironmentalEncounter(mulberry32(seed), 0).kind)
    }
    expect([...kinds].sort()).toEqual(['overboard', 'whirlpool'])
  })
})

describe('contactChaseSpeed', () => {
  it('closes navy faster than pirates, both slightly above the player top speed', () => {
    expect(contactChaseSpeed('navy')).toBe(NAVY_CHASE_SPEED)
    expect(contactChaseSpeed('pirate')).toBe(PIRATE_CHASE_SPEED)
    expect(NAVY_CHASE_SPEED).toBeGreaterThan(PIRATE_CHASE_SPEED)
    // Faster than the player's top speed, so a straight-line flight can't shake
    // a chaser (you escape by mooring or fighting)...
    expect(PIRATE_CHASE_SPEED).toBeGreaterThan(MAX_SAIL_SPEED)
    // ...but only slightly, so maneuvering still buys ground.
    expect(NAVY_CHASE_SPEED).toBeLessThan(MAX_SAIL_SPEED * 1.3)
  })
})

describe('contactStandoffRadius', () => {
  it('closes pirates in to board while navy keeps its distance', () => {
    expect(contactStandoffRadius('pirate')).toBe(PIRATE_STANDOFF_RADIUS)
    expect(contactStandoffRadius('navy')).toBe(NAVY_STANDOFF_RADIUS)
    // Pirates now press all the way in to board (melee): they hold inside both
    // the navy standoff and the 50 m boarding trigger, so closing starts a fight.
    expect(PIRATE_STANDOFF_RADIUS).toBeLessThan(NAVY_STANDOFF_RADIUS)
    expect(PIRATE_STANDOFF_RADIUS).toBeLessThanOrEqual(BOARDING_RADIUS)
  })

  it('holds chasers off the hull (a positive standoff, not a ram)', () => {
    expect(PIRATE_STANDOFF_RADIUS).toBeGreaterThan(0)
    expect(NAVY_STANDOFF_RADIUS).toBeGreaterThan(0)
  })
})

describe('BOARDING_RADIUS', () => {
  it('is the 50 m boarding trigger in normalized world units', () => {
    // 50 m / 6000 m world distance ≈ 0.00833.
    expect(BOARDING_RADIUS).toBeCloseTo(50 / 6000, 9)
  })
})

describe('CONTACT_ENGAGE_RADIUS', () => {
  it('matches the ~650 m cannon reach so closing to firing range starts combat', () => {
    // 0.108 normalized × 6000 m world distance ≈ 648 m, the 80 m/s cannon reach.
    expect(CONTACT_ENGAGE_RADIUS).toBeCloseTo(0.108, 6)
  })
})

describe('spawnContact', () => {
  const player = { x: 0.5, y: 0.5 }

  it('spawns just past the fog horizon and is deterministic in its seed', () => {
    const a = spawnContact(123, 'pirate', player)
    const b = spawnContact(123, 'pirate', player)
    expect(a).toEqual(b)
    const d = contactDistance(player, a)
    expect(d).toBeGreaterThanOrEqual(CONTACT_SPAWN_MIN_DISTANCE - 1e-9)
    expect(d).toBeLessThanOrEqual(CONTACT_SPAWN_MAX_DISTANCE + 1e-9)
  })

  it('stays inside the world and carries combat stats only for pirates', () => {
    const pirate = spawnContact(7, 'pirate', player)
    expect(pirate.kind).toBe('pirate')
    expect(pirate.id).toBe('pirate-7')
    expect(pirate.muzzleSpeed).toBeGreaterThanOrEqual(28)
    expect(pirate.muzzleSpeed).toBeLessThanOrEqual(34)
    expect(pirate.aimDelay).toBeGreaterThanOrEqual(0.5)

    const navy = spawnContact(8, 'navy', { x: 0.98, y: 0.02 })
    expect(navy.kind).toBe('navy')
    expect(navy.muzzleSpeed).toBeUndefined()
    expect(navy.x).toBeGreaterThanOrEqual(0)
    expect(navy.x).toBeLessThanOrEqual(1)
    expect(navy.y).toBeGreaterThanOrEqual(0)
    expect(navy.y).toBeLessThanOrEqual(1)
  })
})

describe('contactDistance', () => {
  it('measures separation between player and contact positions', () => {
    const contact: WorldContact = {
      id: 'pirate-1',
      kind: 'pirate',
      x: 0.5,
      y: 0.5,
      muzzleSpeed: 30,
      aimDelay: 1,
    }
    expect(contactDistance(PLAYER, contact)).toBeCloseTo(Math.hypot(0.1, 0), 5)
  })
})

describe('pirateFiringState', () => {
  const muzzleSpeed = 30
  const max = maxRange(muzzleSpeed)

  it('reports out of range beyond cannon max range', () => {
    const state = pirateFiringState(max + 1, muzzleSpeed, 5, 1)
    expect(state.inRange).toBe(false)
    expect(state.canFire).toBe(false)
  })

  it('reports in range but locked until aim delay elapses', () => {
    const inRangeLocked = pirateFiringState(max * 0.6, muzzleSpeed, 0.2, 1)
    expect(inRangeLocked.inRange).toBe(true)
    expect(inRangeLocked.canFire).toBe(false)

    const inRangeReady = pirateFiringState(max * 0.6, muzzleSpeed, 1.5, 1)
    expect(inRangeReady.inRange).toBe(true)
    expect(inRangeReady.canFire).toBe(true)
  })

  it('unlocks exactly at the aim delay boundary', () => {
    expect(pirateFiringState(40, muzzleSpeed, 0.99, 1).canFire).toBe(false)
    expect(pirateFiringState(40, muzzleSpeed, 1, 1).canFire).toBe(true)
  })
})

describe('isNavyCaptureReady', () => {
  it('is false beyond capture radius and true within it', () => {
    expect(isNavyCaptureReady(CAPTURE_RADIUS + 0.01)).toBe(false)
    expect(isNavyCaptureReady(CAPTURE_RADIUS)).toBe(true)
    expect(isNavyCaptureReady(CAPTURE_RADIUS * 0.5)).toBe(true)
  })
})
