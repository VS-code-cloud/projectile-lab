import { STARTING_TOWN_ID, TOWNS } from './constants'
import { nextSeed } from './rng'
import type { EncounterResult, HighSeasPosition, HighSeasSave } from './types'
import { capacityFor, hullMaxFor } from './upgrades'

function townPosition(townId: string) {
  const town = TOWNS.find((t) => t.id === townId) ?? TOWNS[0]
  return { x: town.x, y: town.y }
}

export function startVoyage(): HighSeasSave {
  return {
    coins: 0,
    cargo: 0,
    upgradeStage: 0,
    hullHp: hullMaxFor(0),
    townId: STARTING_TOWN_ID,
    seed: Date.now() % 2147483647,
    status: 'docked',
    location: townPosition(STARTING_TOWN_ID),
    route: null,
  }
}

export function normalizeHighSeasSave(save: HighSeasSave): HighSeasSave {
  return {
    ...save,
    location: save.location ?? townPosition(save.townId),
    route: save.route ?? null,
  }
}

export function applyResult(
  save: HighSeasSave,
  result: EncounterResult,
): HighSeasSave {
  // Survivable hazards (failing a whirlpool, running from the navy) bruise the
  // hull but never end the voyage: floor at 1 HP instead of 0.
  const floor = result.survivable && save.hullHp > 0 ? 1 : 0
  const hullHp = Math.max(floor, save.hullHp - result.damage)
  const cap = capacityFor(save.upgradeStage)
  return {
    ...save,
    coins: Math.max(0, save.coins + result.coins),
    cargo: Math.max(0, Math.min(cap, save.cargo + result.cargo)),
    hullHp,
    status: hullHp <= 0 ? 'sunk' : save.status,
  }
}

export function arriveAt(save: HighSeasSave, townId: string): HighSeasSave {
  return {
    ...save,
    townId,
    status: 'docked',
    location: townPosition(townId),
    route: null,
  }
}

export function setSail(save: HighSeasSave): HighSeasSave {
  return {
    ...save,
    status: 'sailing',
    seed: nextSeed(save.seed),
  }
}

export function updateLocation(
  save: HighSeasSave,
  location: HighSeasPosition,
): HighSeasSave {
  return {
    ...save,
    location,
    route: null,
  }
}
