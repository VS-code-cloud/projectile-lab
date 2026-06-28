/**
 * Pure state for a ship-to-ship duel: both the player ship and the enemy ship
 * have a hull that depletes over several rounds. The player chips the enemy
 * down with cannon hits (each hit must be set up by reloading via the
 * inclined-plane challenge), and the enemy returns fire while you reload. The
 * UI in `PirateBattle` renders a health bar for each side from this state.
 */
export interface DuelState {
  /** Enemy hull hit points at full health. */
  enemyHpMax: number
  /** Enemy hull hit points remaining (sinks at 0). */
  enemyHp: number
  /** Player hull hit points at full health. */
  hullMax: number
  /** Player hull hit points remaining (sinks at 0). */
  hull: number
}

export function initDuel(params: {
  enemyHpMax: number
  hullMax: number
  hull: number
}): DuelState {
  return {
    enemyHpMax: params.enemyHpMax,
    enemyHp: params.enemyHpMax,
    hullMax: params.hullMax,
    hull: params.hull,
  }
}

/** A landed cannon shot chips the enemy hull, floored at zero. */
export function fireAtEnemy(state: DuelState, damage: number): DuelState {
  return { ...state, enemyHp: Math.max(0, state.enemyHp - damage) }
}

/** The enemy's return shot (taken while you reload) chips your hull. */
export function enemyReturnFire(state: DuelState, damage: number): DuelState {
  return { ...state, hull: Math.max(0, state.hull - damage) }
}

export function enemySunk(state: DuelState): boolean {
  return state.enemyHp <= 0
}

export function shipSunk(state: DuelState): boolean {
  return state.hull <= 0
}

/** A clamped 0..100 integer percentage for a health bar width. */
export function hpPercent(hp: number, max: number): number {
  if (max <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((hp / max) * 100)))
}
