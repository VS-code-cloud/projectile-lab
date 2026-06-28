import { describe, expect, it } from 'vitest'
import { STARTING_TOWN_ID, TOWNS } from '../highseas/constants'
import { capacityFor, hullMaxFor } from '../highseas/upgrades'
import { applyResult, normalizeHighSeasSave, startVoyage } from '../highseas/voyage'

describe('startVoyage', () => {
  it('returns fresh save with defaults', () => {
    const save = startVoyage()
    expect(save.coins).toBe(0)
    expect(save.cargo).toBe(0)
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
  it('adds open-world fields to older saves', () => {
    const legacy = {
      coins: 12,
      cargo: 3,
      upgradeStage: 1,
      hullHp: 90,
      townId: STARTING_TOWN_ID,
      seed: 42,
      status: 'docked' as const,
    }

    const save = normalizeHighSeasSave(legacy)

    expect(save.location).toEqual({ x: TOWNS[0].x, y: TOWNS[0].y })
    expect(save.route).toBeNull()
    expect(save.coins).toBe(12)
  })
})

describe('applyResult', () => {
  it('clamps cargo to capacity', () => {
    const save = startVoyage()
    const cap = capacityFor(0)
    const result = applyResult(save, {
      won: true,
      coins: 0,
      cargo: cap + 50,
      damage: 0,
    })
    expect(result.cargo).toBe(cap)
  })

  it('floors coins at 0', () => {
    const save = { ...startVoyage(), coins: 10 }
    const result = applyResult(save, {
      won: false,
      coins: -50,
      cargo: 0,
      damage: 0,
    })
    expect(result.coins).toBe(0)
  })

  it('reduces hull and flips status to sunk at 0 hp', () => {
    const save = { ...startVoyage(), hullHp: 20, status: 'sailing' as const }
    const result = applyResult(save, {
      won: false,
      coins: 0,
      cargo: 0,
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
      cargo: 0,
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
      cargo: 0,
      damage: 5,
      survivable: true,
    })
    expect(result.hullHp).toBe(0)
    expect(result.status).toBe('sunk')
  })
})
