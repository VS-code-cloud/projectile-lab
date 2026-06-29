import { describe, expect, it } from 'vitest'
import { TOWNS, UPGRADES } from '../highseas/constants'
import {
  buyCargo,
  buyUpgrade,
  canAfford,
  maxBuyable,
  sellAllCargo,
} from '../highseas/economy'
import { capacityFor } from '../highseas/upgrades'
import type { HighSeasSave } from '../highseas/types'

function makeSave(overrides: Partial<HighSeasSave> = {}): HighSeasSave {
  return {
    coins: 0,
    cargo: { silk: 0, spice: 0 },
    upgradeStage: 0,
    hullHp: 100,
    townId: TOWNS[0].id,
    seed: 12345,
    status: 'docked',
    ...overrides,
  }
}

describe('sellAllCargo', () => {
  it('converts each good to coins at the town per-good rates and empties the hold', () => {
    const town = TOWNS[0]
    const save = makeSave({ cargo: { silk: 10, spice: 4 } })
    const result = sellAllCargo(save, town)
    expect(result.coins).toBe(10 * town.buyRates.silk + 4 * town.buyRates.spice)
    expect(result.cargo).toEqual({ silk: 0, spice: 0 })
    expect(result.townId).toBe(save.townId)
  })

  it('values the same hold differently at specialist ports', () => {
    const hold = { silk: 10, spice: 10 }
    const tortuga = TOWNS.find((t) => t.id === 'tortuga')!
    const nassau = TOWNS.find((t) => t.id === 'nassau')!
    const atTortuga = sellAllCargo(makeSave({ cargo: { ...hold } }), tortuga).coins
    const atNassau = sellAllCargo(makeSave({ cargo: { ...hold } }), nassau).coins
    // Tortuga pays more for silk, Nassau more for spice — equal totals here, but
    // a silk-heavy hold should beat Nassau at Tortuga.
    const silkHeavy = { silk: 20, spice: 0 }
    expect(sellAllCargo(makeSave({ cargo: silkHeavy }), tortuga).coins).toBeGreaterThan(
      sellAllCargo(makeSave({ cargo: silkHeavy }), nassau).coins,
    )
    expect(atTortuga).toBe(atNassau)
  })
})

describe('buyCargo', () => {
  it('adds the good and deducts coins at the town rate', () => {
    const town = TOWNS[0]
    const save = makeSave({ coins: 1000 })
    const result = buyCargo(save, town, 'silk', 3)
    expect(result.cargo.silk).toBe(3)
    expect(result.coins).toBe(1000 - 3 * town.buyRates.silk)
  })

  it('caps the purchase at what the player can afford', () => {
    const town = TOWNS[0]
    const save = makeSave({ coins: town.buyRates.spice * 2 })
    const result = buyCargo(save, town, 'spice', 99)
    expect(result.cargo.spice).toBe(2)
    expect(result.coins).toBe(0)
  })

  it('caps the purchase at remaining hold capacity', () => {
    const town = TOWNS[0]
    const cap = capacityFor(0)
    const save = makeSave({ coins: 1_000_000, cargo: { silk: cap - 1, spice: 0 } })
    const result = buyCargo(save, town, 'silk', 50)
    expect(result.cargo.silk).toBe(cap)
    expect(maxBuyable(result, town, 'silk')).toBe(0)
  })

  it('is a no-op when nothing can be bought', () => {
    const town = TOWNS[0]
    const save = makeSave({ coins: 0 })
    expect(buyCargo(save, town, 'silk', 5)).toBe(save)
  })

  it('enables a buy-low/sell-high loop across ports', () => {
    const tortuga = TOWNS.find((t) => t.id === 'tortuga')!
    const nassau = TOWNS.find((t) => t.id === 'nassau')!
    // Silk is cheap at Nassau, dear at Tortuga.
    const bought = buyCargo(makeSave({ coins: 1000 }), nassau, 'silk', 10)
    const spent = 1000 - bought.coins
    const sold = sellAllCargo(bought, tortuga)
    expect(sold.coins).toBeGreaterThan(1000)
    expect(sold.coins - 1000).toBe(
      10 * tortuga.buyRates.silk - spent,
    )
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
