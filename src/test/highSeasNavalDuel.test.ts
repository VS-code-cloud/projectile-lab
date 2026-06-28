import { describe, expect, it } from 'vitest'
import {
  enemyReturnFire,
  enemySunk,
  fireAtEnemy,
  hpPercent,
  initDuel,
  shipSunk,
} from '../highseas/navalDuel'

describe('initDuel', () => {
  it('starts both ships at full health', () => {
    const duel = initDuel({ enemyHpMax: 100, hullMax: 100, hull: 80 })
    expect(duel.enemyHp).toBe(100)
    expect(duel.enemyHpMax).toBe(100)
    expect(duel.hull).toBe(80)
    expect(duel.hullMax).toBe(100)
    expect(enemySunk(duel)).toBe(false)
    expect(shipSunk(duel)).toBe(false)
  })
})

describe('fireAtEnemy', () => {
  it('reduces enemy hull and clamps at zero', () => {
    const duel = initDuel({ enemyHpMax: 100, hullMax: 100, hull: 100 })
    const once = fireAtEnemy(duel, 40)
    expect(once.enemyHp).toBe(60)
    expect(enemySunk(once)).toBe(false)
    const dead = fireAtEnemy(fireAtEnemy(once, 40), 40)
    expect(dead.enemyHp).toBe(0)
    expect(enemySunk(dead)).toBe(true)
  })

  it('sinks the enemy in three hits at the default chip damage', () => {
    let duel = initDuel({ enemyHpMax: 100, hullMax: 100, hull: 100 })
    const chip = Math.ceil(duel.enemyHpMax / 3)
    for (let i = 0; i < 3; i++) duel = fireAtEnemy(duel, chip)
    expect(enemySunk(duel)).toBe(true)
  })

  it('does not touch the player hull', () => {
    const duel = initDuel({ enemyHpMax: 100, hullMax: 100, hull: 70 })
    expect(fireAtEnemy(duel, 40).hull).toBe(70)
  })
})

describe('enemyReturnFire', () => {
  it('reduces the player hull and clamps at zero', () => {
    const duel = initDuel({ enemyHpMax: 100, hullMax: 100, hull: 30 })
    const hit = enemyReturnFire(duel, 20)
    expect(hit.hull).toBe(10)
    expect(shipSunk(hit)).toBe(false)
    const sunk = enemyReturnFire(hit, 25)
    expect(sunk.hull).toBe(0)
    expect(shipSunk(sunk)).toBe(true)
  })

  it('does not touch the enemy hull', () => {
    const duel = initDuel({ enemyHpMax: 100, hullMax: 100, hull: 100 })
    expect(enemyReturnFire(duel, 20).enemyHp).toBe(100)
  })
})

describe('hpPercent', () => {
  it('maps hp to a clamped 0..100 integer', () => {
    expect(hpPercent(100, 100)).toBe(100)
    expect(hpPercent(50, 100)).toBe(50)
    expect(hpPercent(0, 100)).toBe(0)
    expect(hpPercent(-10, 100)).toBe(0)
    expect(hpPercent(33, 100)).toBe(33)
  })

  it('is safe when max is zero', () => {
    expect(hpPercent(0, 0)).toBe(0)
  })
})
