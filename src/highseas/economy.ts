import type { HighSeasSave, Town } from './types'
import { nextUpgrade } from './upgrades'

export function sellAllCargo(save: HighSeasSave, town: Town): HighSeasSave {
  return {
    ...save,
    coins: save.coins + save.cargo * town.buyRate,
    cargo: 0,
  }
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
