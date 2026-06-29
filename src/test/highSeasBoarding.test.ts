import { describe, expect, it } from 'vitest'
import { buildBoardingEncounter } from '../highseas/worldEncounters'
import { mulberry32 } from '../highseas/rng'
import { requiredAngleDeg } from '../highseas/combat'
import { evaluateShot } from '../lib/cannonGame'
import { evaluateOrbit } from '../lib/maelstromGame'
import { evaluateShove } from '../lib/shoveGame'
import { boardingDamageFor, boardingLootFor } from '../highseas/boardingMath'

const SEED_COUNT = 240

describe('buildBoardingEncounter: every phase is winnable', () => {
  it('phase 1 (grenade) has a solvable launch angle that lands a hit', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const e = buildBoardingEncounter(mulberry32(seed), seed % 4)
      const angle = requiredAngleDeg(e.grenadeDistance, e.grenadeSpeed)
      expect(angle).not.toBeNull()
      const shot = evaluateShot(
        e.grenadeSpeed,
        angle!,
        e.grenadeDistance,
        e.grenadeTolerance,
      )
      expect(shot.status).toBe('hit')
    }
  })

  it('phase 2 (rope swing) snaps at the integer speed v = sqrt(a*r)', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const e = buildBoardingEncounter(mulberry32(seed), seed % 4)
      const v = Math.round(Math.sqrt(e.ropeBreakAccel * e.ropeRadius))
      // The curated swing table yields exact integer answers.
      expect(v * v).toBe(e.ropeBreakAccel * e.ropeRadius)
      const r = evaluateOrbit(v, e.ropeRadius, e.ropeBreakAccel, e.ropeTolerance)
      expect(r.status).toBe('hit')
    }
  })

  it('phase 3 (shove) hits at the separation force F = m*a', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const e = buildBoardingEncounter(mulberry32(seed), seed % 4)
      const force = e.pirateShipMass * e.separationAccel
      const r = evaluateShove(
        force,
        e.pirateShipMass,
        e.separationAccel,
        e.shoveTolerance,
      )
      expect(r.status).toBe('hit')
      // The force lands on a tidy integer (mass ×100, accel a half-step).
      expect(Number.isInteger(force)).toBe(true)
    }
  })

  it('keeps every generated parameter inside its documented range', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const e = buildBoardingEncounter(mulberry32(seed), seed % 4)
      expect(e.grenadeSpeed).toBeGreaterThanOrEqual(18)
      expect(e.grenadeSpeed).toBeLessThanOrEqual(24)
      expect(e.ropeRadius).toBeGreaterThanOrEqual(4)
      expect(e.ropeRadius).toBeLessThanOrEqual(8)
      expect(e.pirateShipMass).toBeGreaterThanOrEqual(6000)
      expect(e.pirateShipMass).toBeLessThanOrEqual(12000)
      expect([0.5, 1, 1.5]).toContain(e.separationAccel)
      expect(e.lootMultiplierPct).toBeGreaterThanOrEqual(150)
      expect(e.lootMultiplierPct).toBeLessThanOrEqual(210)
      expect(e.hullDamagePct).toBeGreaterThanOrEqual(12)
      expect(e.hullDamagePct).toBeLessThanOrEqual(18)
    }
  })
})

describe('boarding economy', () => {
  it('loot always beats firing the same pirate (a >1 multiplier on the base roll)', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const e = buildBoardingEncounter(mulberry32(seed), seed % 4)
      const loot = boardingLootFor(e)
      expect(e.lootMultiplierPct).toBeGreaterThan(100)
      // Strictly more cargo than the base (cannon) loot for this encounter.
      expect(loot).toBeGreaterThan(e.baseLoot)
    }
  })

  it('guaranteed damage is a percent of hull max, growing with each miss', () => {
    const e = buildBoardingEncounter(mulberry32(7), 2)
    const hullMax = 120
    const guaranteed = Math.round((hullMax * e.hullDamagePct) / 100)
    expect(boardingDamageFor(e, hullMax, 0)).toBe(guaranteed)
    expect(boardingDamageFor(e, hullMax, 1)).toBe(guaranteed + e.missDamage)
    expect(boardingDamageFor(e, hullMax, 3)).toBe(guaranteed + 3 * e.missDamage)
  })

  it('takes a real (non-zero) guaranteed hull hit even on a clean sweep', () => {
    for (let seed = 0; seed < 40; seed++) {
      const e = buildBoardingEncounter(mulberry32(seed), 0)
      expect(boardingDamageFor(e, 100, 0)).toBeGreaterThan(0)
    }
  })
})
