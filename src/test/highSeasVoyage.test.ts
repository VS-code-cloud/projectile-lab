import { describe, expect, it } from 'vitest'
import { STARTING_TOWN_ID, TOWNS } from '../highseas/constants'
import { capacityFor, hullMaxFor } from '../highseas/upgrades'
import type { HighSeasSave } from '../highseas/types'
import {
  applyResult,
  normalizeHighSeasSave,
  startVoyage,
  wouldSink,
} from '../highseas/voyage'

describe('startVoyage', () => {
  it('returns fresh save with defaults', () => {
    const save = startVoyage()
    expect(save.coins).toBe(0)
    expect(save.cargo).toEqual({ rum: 0, spice: 0 })
    expect(save.upgradeStage).toBe(0)
    expect(save.hullHp).toBe(hullMaxFor(0))
    expect(save.townId).toBe(STARTING_TOWN_ID)
    expect(save.location).toEqual({ x: TOWNS[0].x, y: TOWNS[0].y })
    expect(save.route).toBeNull()
    expect(save.status).toBe('docked')
    expect(save.seed).toBeGreaterThan(0)
  })
})

describe('normalizeHighSeasSave', () => {
  it('adds open-world fields and migrates legacy numeric cargo', () => {
    // Older saves stored `cargo` as a single number; normalize migrates it into
    // the two-good hold shape (treated as rum).
    const legacy = {
      coins: 12,
      cargo: 3,
      upgradeStage: 1,
      hullHp: 90,
      townId: STARTING_TOWN_ID,
      seed: 42,
      status: 'docked' as const,
    } as unknown as HighSeasSave

    const save = normalizeHighSeasSave(legacy)

    expect(save.location).toEqual({ x: TOWNS[0].x, y: TOWNS[0].y })
    expect(save.route).toBeNull()
    expect(save.coins).toBe(12)
    expect(save.cargo).toEqual({ rum: 3, spice: 0 })
  })
})

describe('applyResult', () => {
  it('clamps cargo to capacity', () => {
    const save = startVoyage()
    const cap = capacityFor(0)
    const result = applyResult(save, {
      won: true,
      coins: 0,
      cargo: { rum: cap + 50 },
      damage: 0,
    })
    expect(result.cargo).toEqual({ rum: cap, spice: 0 })
  })

  it('floors coins at 0', () => {
    const save = { ...startVoyage(), coins: 10 }
    const result = applyResult(save, {
      won: false,
      coins: -50,
      cargo: {},
      damage: 0,
    })
    expect(result.coins).toBe(0)
  })

  it('reduces hull and flips status to sunk at 0 hp', () => {
    const save = { ...startVoyage(), hullHp: 20, status: 'sailing' as const }
    const result = applyResult(save, {
      won: false,
      coins: 0,
      cargo: {},
      damage: 25,
    })
    expect(result.hullHp).toBe(0)
    expect(result.status).toBe('sunk')
  })

  it('floors survivable damage at 1 hp so the voyage continues', () => {
    const save = { ...startVoyage(), hullHp: 20, status: 'sailing' as const }
    const result = applyResult(save, {
      won: false,
      coins: 0,
      cargo: {},
      damage: 999,
      survivable: true,
    })
    expect(result.hullHp).toBe(1)
    expect(result.status).toBe('sailing')
  })

  it('does not revive an already-sunk hull via survivable', () => {
    const save = { ...startVoyage(), hullHp: 0, status: 'sunk' as const }
    const result = applyResult(save, {
      won: false,
      coins: 0,
      cargo: {},
      damage: 5,
      survivable: true,
    })
    expect(result.hullHp).toBe(0)
    expect(result.status).toBe('sunk')
  })
})

describe('wouldSink', () => {
  it('is true when a non-survivable hit drops hull to 0 or below', () => {
    const save = { ...startVoyage(), hullHp: 20, status: 'sailing' as const }
    expect(wouldSink(save, { won: false, coins: 0, cargo: {}, damage: 25 })).toBe(
      true,
    )
  })

  it('is false for a survivable hazard even when damage exceeds the hull', () => {
    // The user requirement: failing a whirlpool or escaping the navy must
    // damage but NOT destroy the ship. A raw `hull - damage <= 0` check would
    // wrongly end the voyage here; wouldSink must mirror applyResult's floor.
    const save = { ...startVoyage(), hullHp: 18, status: 'sailing' as const }
    expect(
      wouldSink(save, {
        won: false,
        coins: 0,
        cargo: {},
        damage: 26,
        survivable: true,
      }),
    ).toBe(false)
  })

  it('is false when damage leaves hull above 0', () => {
    const save = { ...startVoyage(), hullHp: 100, status: 'sailing' as const }
    expect(wouldSink(save, { won: false, coins: 0, cargo: {}, damage: 30 })).toBe(
      false,
    )
  })

  it('agrees with applyResult about the resulting sunk status', () => {
    const save = { ...startVoyage(), hullHp: 10, status: 'sailing' as const }
    for (const result of [
      { won: false, coins: 0, cargo: {}, damage: 10 },
      { won: false, coins: 0, cargo: {}, damage: 9 },
      { won: false, coins: 0, cargo: {}, damage: 999, survivable: true },
    ]) {
      expect(wouldSink(save, result)).toBe(
        applyResult(save, result).hullHp <= 0,
      )
    }
  })
})
