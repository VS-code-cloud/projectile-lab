import { describe, expect, it } from 'vitest'
import { aimDelaySeconds, maxRange, requiredAngleDeg } from '../highseas/combat'
import { generateMooringSituation } from '../highseas/mooringSituation'
import { mulberry32 } from '../highseas/rng'
import type { EncounterResult, HighSeasSave } from '../highseas/types'
import { capacityFor } from '../highseas/upgrades'
import {
  buildEnvironmentalEncounter,
  buildNavyEncounter,
  buildOverboardEncounter,
  buildPirateEncounter,
  buildWhirlpoolEncounter,
} from '../highseas/worldEncounters'
import { applyResult, startVoyage, wouldSink } from '../highseas/voyage'
import { evaluateShot } from '../lib/cannonGame'
import { evaluateHeel } from '../lib/heelGame'
import { evaluateJettison, keepMass } from '../lib/jettisonGame'
import { evaluateKedge } from '../lib/kedgeGame'
import { evaluateOrbit } from '../lib/maelstromGame'
import { evaluateStop } from '../lib/stopGame'

const SEED_COUNT = 201

function sailingSave(overrides: Partial<HighSeasSave> = {}): HighSeasSave {
  return { ...startVoyage(), status: 'sailing', ...overrides }
}

function jettisonCargoLost(cargo: number): number {
  return Math.max(1, Math.min(cargo, Math.ceil(cargo * 0.35)))
}

function buildSolvablePirate(seed: number) {
  const rand = mulberry32(seed)
  const muzzleSpeed = Math.round(28 + rand() * 6)
  const range = maxRange(muzzleSpeed)
  const distance = Math.round(range * (0.35 + rand() * 0.45))
  return buildPirateEncounter({
    distance,
    muzzleSpeed,
    aimDelay: aimDelaySeconds(rand()),
    rand,
  })
}

describe('winnability: pirate cannon', () => {
  it('grades every generated encounter as a hit at the displayed distance', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const encounter = buildSolvablePirate(seed)
      const angle = requiredAngleDeg(encounter.distance, encounter.muzzleSpeed)
      expect(angle).not.toBeNull()
      const shot = evaluateShot(
        encounter.muzzleSpeed,
        angle!,
        encounter.distance,
        encounter.tolerance,
      )
      expect(shot.status).toBe('hit')
    }
  })
})

describe('winnability: navy jettison', () => {
  it('grades the displayed keep-mass target as a hit', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const stage = seed % 4
      const encounter = buildNavyEncounter(mulberry32(seed), stage)
      const target = Math.round(keepMass(encounter.force, encounter.escapeAccel))
      const result = evaluateJettison(
        target,
        encounter.force,
        encounter.escapeAccel,
        encounter.tolerance,
      )
      expect(result.status).toBe('hit')
    }
  })
})

describe('winnability: overboard stop', () => {
  it('grades the displayed stopping distance as a hit', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const encounter = buildOverboardEncounter(mulberry32(seed), seed % 4)
      const target = Math.round((encounter.v0 * encounter.v0) / (2 * encounter.a))
      const result = evaluateStop(
        target,
        encounter.v0,
        encounter.a,
        encounter.tolerance,
      )
      expect(result.status).toBe('hit')
    }
  })
})

describe('winnability: whirlpool maelstrom', () => {
  it('grades the displayed hold speed as a hit', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const encounter = buildWhirlpoolEncounter(mulberry32(seed), seed % 4)
      const targetSpeed = Math.round(
        Math.sqrt(encounter.targetAccel * encounter.radius),
      )
      const result = evaluateOrbit(
        targetSpeed,
        encounter.radius,
        encounter.targetAccel,
        encounter.tolerance,
      )
      expect(result.status).toBe('hit')
    }
  })
})

describe('winnability: environmental encounters', () => {
  it('routes overboard and whirlpool builders to solvable targets', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const encounter = buildEnvironmentalEncounter(mulberry32(seed), seed % 4)
      if (encounter.kind === 'overboard') {
        const target = Math.round((encounter.v0 * encounter.v0) / (2 * encounter.a))
        expect(
          evaluateStop(target, encounter.v0, encounter.a, encounter.tolerance).status,
        ).toBe('hit')
      } else {
        const targetSpeed = Math.round(
          Math.sqrt(encounter.targetAccel * encounter.radius),
        )
        expect(
          evaluateOrbit(
            targetSpeed,
            encounter.radius,
            encounter.targetAccel,
            encounter.tolerance,
          ).status,
        ).toBe('hit')
      }
    }
  })
})

describe('winnability: mooring kedge', () => {
  it('grades the computed correct haul as a hit', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const situation = generateMooringSituation(mulberry32(seed))
      const result = evaluateKedge(
        situation.correctHaul,
        situation.windForce,
        situation.currentForce,
        situation.targetNet,
        situation.tolerance,
      )
      expect(result.status).toBe('hit')
    }
  })
})

describe('winnability: heel reload', () => {
  it('accepts the fixed reload challenge heel angle', () => {
    const target = 7
    const length = 5
    const tolerance = 0.4
    expect(evaluateHeel(30, length, target, tolerance).status).toBe('hit')
  })
})

describe('success resolutions via applyResult', () => {
  describe('pirate victory', () => {
    it('adds loot to cargo, applies damage, and keeps sailing when hull remains', () => {
      const save = sailingSave({ cargo: { rum: 5, spice: 0 }, hullHp: 80 })
      const encounter = buildSolvablePirate(42)
      const damage = 12
      const next = applyResult(save, {
        won: true,
        coins: 0,
        cargo: { rum: encounter.loot },
        damage,
      })
      expect(next.cargo).toEqual({
        rum: Math.min(capacityFor(0), 5 + encounter.loot),
        spice: 0,
      })
      expect(next.hullHp).toBe(save.hullHp - damage)
      expect(next.status).toBe('sailing')
    })
  })

  describe('navy escape', () => {
    it('auto-escape leaves cargo and hull unchanged', () => {
      const save = sailingSave({ cargo: { rum: 2, spice: 0 }, hullHp: 90 })
      const next = applyResult(save, {
        won: true,
        coins: 0,
        cargo: {},
        damage: 0,
      })
      expect(next.cargo).toEqual({ rum: 2, spice: 0 })
      expect(next.hullHp).toBe(90)
      expect(next.status).toBe('sailing')
    })

    it('jettison win drops cargo by the chase-loss formula without going below zero', () => {
      const cases = [
        { cargo: 1, stage: 0 },
        { cargo: 3, stage: 0 },
        { cargo: 5, stage: 0 },
        { cargo: 10, stage: 0 },
        { cargo: 20, stage: 0 },
        { cargo: 40, stage: 1 },
      ]
      for (const { cargo, stage } of cases) {
        const lost = jettisonCargoLost(cargo)
        expect(lost).toBe(Math.max(1, Math.min(cargo, Math.ceil(cargo * 0.35))))

        const save = sailingSave({ cargo: { rum: cargo, spice: 0 }, upgradeStage: stage })
        const cap = capacityFor(stage)
        const next = applyResult(save, {
          won: true,
          coins: 0,
          cargo: { rum: -lost },
          damage: 0,
        })
        expect(next.cargo).toEqual({
          rum: Math.max(0, Math.min(cap, cargo - lost)),
          spice: 0,
        })
      }
    })
  })

  describe('overboard rescue', () => {
    it('awards the encounter reward in coins', () => {
      const encounter = buildOverboardEncounter(mulberry32(7), 1)
      const save = sailingSave({ coins: 15 })
      const next = applyResult(save, {
        won: true,
        coins: encounter.reward,
        cargo: {},
        damage: 0,
      })
      expect(next.coins).toBe(save.coins + encounter.reward)
      expect(next.cargo).toEqual(save.cargo)
      expect(next.hullHp).toBe(save.hullHp)
    })
  })

  describe('mooring and whirlpool success', () => {
    it('leaves the save unchanged except status stays sailing', () => {
      const save = sailingSave({ coins: 40, cargo: { rum: 8, spice: 0 }, hullHp: 70 })
      const unchanged = applyResult(save, {
        won: true,
        coins: 0,
        cargo: {},
        damage: 0,
      })
      expect(unchanged).toEqual(save)
    })
  })
})

describe('failure resolutions and survivable rule', () => {
  it('whirlpool fail bruises low hull to 1 HP without sinking', () => {
    const encounter = buildWhirlpoolEncounter(mulberry32(11), 0)
    const save = sailingSave({ hullHp: 10 })
    const result: EncounterResult = {
      won: false,
      coins: 0,
      cargo: {},
      damage: encounter.damage,
      survivable: true,
    }
    expect(encounter.damage).toBeGreaterThan(save.hullHp)
    expect(wouldSink(save, result)).toBe(false)
    const next = applyResult(save, result)
    expect(next.hullHp).toBe(1)
    expect(next.status).toBe('sailing')
  })

  it('navy surrender bruises low hull to 1 HP without sinking', () => {
    const encounter = buildNavyEncounter(mulberry32(19), 0)
    const save = sailingSave({ hullHp: 10 })
    const result: EncounterResult = {
      won: false,
      coins: 0,
      cargo: {},
      damage: encounter.damage,
      survivable: true,
    }
    expect(encounter.damage).toBeGreaterThan(save.hullHp)
    expect(wouldSink(save, result)).toBe(false)
    const next = applyResult(save, result)
    expect(next.hullHp).toBe(1)
    expect(next.status).toBe('sailing')
  })

  it('overboard miss leaves the save unchanged', () => {
    const save = sailingSave({ coins: 22, cargo: { rum: 6, spice: 0 }, hullHp: 55 })
    const result: EncounterResult = {
      won: false,
      coins: 0,
      cargo: {},
      damage: 0,
    }
    expect(wouldSink(save, result)).toBe(false)
    expect(applyResult(save, result)).toEqual(save)
  })

  it('pirate retreat sinks when damage meets or exceeds hull', () => {
    const encounter = buildSolvablePirate(3)
    const save = sailingSave({ hullHp: 20 })
    const result: EncounterResult = {
      won: false,
      coins: 0,
      cargo: {},
      damage: encounter.damage,
    }
    expect(encounter.damage).toBeGreaterThanOrEqual(save.hullHp)
    expect(wouldSink(save, result)).toBe(true)
    const next = applyResult(save, result)
    expect(next.hullHp).toBe(0)
    expect(next.status).toBe('sunk')
  })
})

describe('wouldSink mirrors applyResult hull floor', () => {
  it('matches applyResult sunk status across survivable and damage values', () => {
    const save = sailingSave({ hullHp: 10 })
    const matrix: EncounterResult[] = [
      { won: false, coins: 0, cargo: {}, damage: 0 },
      { won: false, coins: 0, cargo: {}, damage: 5 },
      { won: false, coins: 0, cargo: {}, damage: 10 },
      { won: false, coins: 0, cargo: {}, damage: 11 },
      { won: false, coins: 0, cargo: {}, damage: 25, survivable: true },
      { won: false, coins: 0, cargo: {}, damage: 999, survivable: true },
      { won: false, coins: 0, cargo: {}, damage: 25 },
    ]
    for (const result of matrix) {
      expect(wouldSink(save, result)).toBe(
        applyResult(save, result).hullHp <= 0,
      )
    }
  })
})
