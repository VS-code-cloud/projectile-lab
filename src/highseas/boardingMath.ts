import type { BoardingEncounter } from './types'

/**
 * Cargo hauled from a won boarding. The loot multiplier (>100%) is applied to
 * the same base roll a cannon kill would give, so boarding always out-loots
 * firing on the pirate.
 */
export function boardingLootFor(encounter: BoardingEncounter): number {
  return Math.round((encounter.baseLoot * encounter.lootMultiplierPct) / 100)
}

/**
 * Hull damage taken from a boarding: a guaranteed percentage of hull max (paid
 * even on a flawless sweep) plus a per-miss penalty for each phase fumbled.
 */
export function boardingDamageFor(
  encounter: BoardingEncounter,
  hullMax: number,
  misses: number,
): number {
  const guaranteed = Math.round((hullMax * encounter.hullDamagePct) / 100)
  return guaranteed + misses * encounter.missDamage
}
