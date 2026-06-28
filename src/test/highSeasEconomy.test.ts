import { describe, expect, it } from 'vitest'
import { TOWNS, UPGRADES } from '../highseas/constants'
import { buyUpgrade, canAfford, sellAllCargo } from '../highseas/economy'
import type { HighSeasSave } from '../highseas/types'

function makeSave(overrides: Partial<HighSeasSave> = {}): HighSeasSave {
  return {
    coins: 0,
    cargo: 0,
    upgradeStage: 0,
    hullHp: 100,
    townId: TOWNS[0].id,
    seed: 12345,
    status: 'docked',
    ...overrides,
  }
}

describe('sellAllCargo', () => {
  it('converts cargo to coins at town buyRate and zeroes cargo', () => {
    const town = TOWNS[0]
    const save = makeSave({ cargo: 10 })
    const result = sellAllCargo(save, town)
    expect(result.coins).toBe(10 * town.buyRate)
    expect(result.cargo).toBe(0)
    expect(result.townId).toBe(save.townId)
  })
})

describe('canAfford', () => {
  it('returns true when coins meet the next upgrade cost', () => {
    const save = makeSave({ coins: UPGRADES[1].cost, upgradeStage: 0 })
    expect(canAfford(save)).toBe(true)
  })

  it('returns false when broke', () => {
    const save = makeSave({ coins: 0, upgradeStage: 0 })
    expect(canAfford(save)).toBe(false)
  })

  it('returns false when maxed', () => {
    const save = makeSave({ coins: 9999, upgradeStage: 3 })
    expect(canAfford(save)).toBe(false)
  })
})

describe('buyUpgrade', () => {
  it('advances stage and deducts cost when affordable', () => {
    const cost = UPGRADES[1].cost
    const save = makeSave({ coins: cost, upgradeStage: 0 })
    const upgraded = buyUpgrade(save)
    expect(upgraded.upgradeStage).toBe(1)
    expect(upgraded.coins).toBe(0)
  })

  it('is a no-op when broke', () => {
    const save = makeSave({ coins: 0, upgradeStage: 0 })
    expect(buyUpgrade(save)).toBe(save)
  })

  it('is a no-op when maxed', () => {
    const save = makeSave({ coins: 9999, upgradeStage: 3 })
    expect(buyUpgrade(save)).toBe(save)
  })
})
