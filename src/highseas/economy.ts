import type { CargoGood, HighSeasSave, Town } from './types'
import { emptyHold, holdTotal, holdValue, toHold } from './cargo'
import { capacityFor, nextUpgrade } from './upgrades'

export function sellAllCargo(save: HighSeasSave, town: Town): HighSeasSave {
  return {
    ...save,
    coins: save.coins + holdValue(toHold(save.cargo), town.buyRates),
    cargo: emptyHold(),
  }
}

/**
 * Most units of `good` the player could buy here right now, limited by coins and
 * remaining hold capacity. Buying uses the same per-good rate the town sells at,
 * so the profit is the spread between two ports.
 */
export function maxBuyable(
  save: HighSeasSave,
  town: Town,
  good: CargoGood,
): number {
  const price = town.buyRates[good]
  if (price <= 0) return 0
  const space = capacityFor(save.upgradeStage) - holdTotal(toHold(save.cargo))
  const affordable = Math.floor(save.coins / price)
  return Math.max(0, Math.min(space, affordable))
}

/** Buys up to `amount` units of `good`, capped by coins and hold space. */
export function buyCargo(
  save: HighSeasSave,
  town: Town,
  good: CargoGood,
  amount: number,
): HighSeasSave {
  const count = Math.min(amount, maxBuyable(save, town, good))
  if (count <= 0) return save
  const price = town.buyRates[good]
  const hold = toHold(save.cargo)
  const cargo =
    good === 'rum'
      ? { rum: hold.rum + count, spice: hold.spice }
      : { rum: hold.rum, spice: hold.spice + count }
  return { ...save, coins: save.coins - count * price, cargo }
}

export function canAfford(save: HighSeasSave): boolean {
  const next = nextUpgrade(save.upgradeStage)
  return next !== null && save.coins >= next.cost
}

export function buyUpgrade(save: HighSeasSave): HighSeasSave {
  if (!canAfford(save)) return save
  const next = nextUpgrade(save.upgradeStage)!
  return {
    ...save,
    upgradeStage: save.upgradeStage + 1,
    coins: save.coins - next.cost,
  }
}
