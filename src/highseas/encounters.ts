import { aimDelaySeconds, maxRange } from './combat'
import type { Encounter, EncounterKind } from './types'
import { ENEMY_HP_MAX, windForceFor, NAVY_ESCAPE_ACCEL } from './worldEncounters'

const KIND_WEIGHTS: { kind: EncounterKind; weight: number }[] = [
  { kind: 'pirate', weight: 50 },
  { kind: 'navy', weight: 20 },
  { kind: 'overboard', weight: 15 },
  { kind: 'whirlpool', weight: 15 },
]

function randInt(rand: () => number, min: number, max: number): number {
  return Math.round(min + rand() * (max - min))
}

function pickKind(rand: () => number): EncounterKind {
  const total = KIND_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = rand() * total
  for (const entry of KIND_WEIGHTS) {
    roll -= entry.weight
    if (roll <= 0) return entry.kind
  }
  return KIND_WEIGHTS[0].kind
}

export function rollEncounter(rand: () => number, stage: number): Encounter {
  const kind = pickKind(rand)

  switch (kind) {
    case 'pirate': {
      const muzzleSpeed = randInt(rand, 28, 34)
      const range = maxRange(muzzleSpeed)
      const distance = randInt(rand, Math.round(range * 0.3), Math.round(range * 0.95))
      return {
        kind: 'pirate',
        distance,
        muzzleSpeed,
        tolerance: randInt(rand, 6, 10),
        loot: randInt(rand, 4, 10),
        damage: randInt(rand, 15, 30),
        aimDelay: aimDelaySeconds(rand()),
        enemyHpMax: ENEMY_HP_MAX,
      }
    }
    case 'navy':
      return {
        kind: 'navy',
        force: windForceFor(rand, stage),
        escapeAccel: NAVY_ESCAPE_ACCEL,
        tolerance: randInt(rand, 30, 50),
        damage: randInt(rand, 20, 35),
      }
    case 'overboard':
      return {
        kind: 'overboard',
        v0: randInt(rand, 16, 24),
        a: randInt(rand, 2, 3),
        tolerance: 5,
        reward: randInt(rand, 10, 20),
      }
    case 'whirlpool':
      return {
        kind: 'whirlpool',
        radius: randInt(rand, 4, 6),
        targetAccel: randInt(rand, 16, 24),
        tolerance: 2,
        damage: randInt(rand, 20, 30),
      }
  }
}
