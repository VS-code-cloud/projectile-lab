import { UPGRADES } from './constants'
import { maxRange } from './combat'
import type { UpgradeTier } from './types'

function clampStage(stage: number): number {
  return Math.max(0, Math.min(stage, UPGRADES.length - 1))
}

export function capacityFor(stage: number): number {
  return UPGRADES[clampStage(stage)].capacity
}

export function forceFor(stage: number): number {
  return UPGRADES[clampStage(stage)].force
}

export function hullMaxFor(stage: number): number {
  return UPGRADES[clampStage(stage)].hullMax
}

export function nextUpgrade(stage: number): UpgradeTier | null {
  const next = stage + 1
  return next < UPGRADES.length ? UPGRADES[next] : null
}

export interface ShipStats {
  capacity: number
  force: number
  hullMax: number
  maxSpeed: number
  visibilityRadius: number
  cannonMuzzleSpeed: number
  maxFiringRange: number
}

export function shipStatsFor(stage: number): ShipStats {
  const clamped = clampStage(stage)
  const upgrade = UPGRADES[clamped]
  // Cannons fire at ~80 m/s, giving a flat-ground reach of v²/g ≈ 653 m at
  // stage 0 (the practical "combat range"); each upgrade extends it a little.
  const cannonMuzzleSpeed = 80 + clamped * 4

  return {
    capacity: upgrade.capacity,
    force: upgrade.force,
    hullMax: upgrade.hullMax,
    maxSpeed: 0.09 + clamped * 0.015,
    visibilityRadius: 0.18 + clamped * 0.025,
    cannonMuzzleSpeed,
    maxFiringRange: maxRange(cannonMuzzleSpeed),
  }
}
