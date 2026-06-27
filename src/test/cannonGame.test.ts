import { describe, expect, it } from 'vitest'
import {
  classifyDistance,
  evaluateShot,
  shotDistance,
} from '../lib/cannonGame'

describe('shotDistance', () => {
  it('matches the flat-ground range relationship', () => {
    // Max range at 45 deg for v=80, g=9.8 is v^2/g = 653.06 m.
    expect(shotDistance(80, 45)).toBeCloseTo(653.06, 1)
  })

  it('is symmetric for complementary angles', () => {
    expect(shotDistance(80, 25)).toBeCloseTo(shotDistance(80, 65), 6)
  })
})

describe('classifyDistance', () => {
  const target = 500
  const tol = 5

  it('treats the zone bounds as inclusive hits', () => {
    expect(classifyDistance(495, target, tol)).toBe('hit')
    expect(classifyDistance(500, target, tol)).toBe('hit')
    expect(classifyDistance(505, target, tol)).toBe('hit')
  })

  it('flags landings before the zone as short', () => {
    expect(classifyDistance(494.9, target, tol)).toBe('short')
    expect(classifyDistance(0, target, tol)).toBe('short')
  })

  it('flags landings past the zone as far', () => {
    expect(classifyDistance(505.1, target, tol)).toBe('far')
    expect(classifyDistance(653, target, tol)).toBe('far')
  })
})

describe('evaluateShot (v=80, target=500, tolerance=5)', () => {
  const v = 80
  const target = 500
  const tol = 5

  it('accepts the two intended whole-degree solutions', () => {
    for (const angle of [25, 65]) {
      const result = evaluateShot(v, angle, target, tol)
      expect(result.status).toBe('hit')
      expect(result.distance).toBeGreaterThanOrEqual(target - tol)
      expect(result.distance).toBeLessThanOrEqual(target + tol)
    }
  })

  it('rejects the adjacent degrees that fall outside the zone', () => {
    expect(evaluateShot(v, 24, target, tol).status).toBe('short')
    expect(evaluateShot(v, 26, target, tol).status).toBe('far')
  })

  it('classifies clearly wrong angles', () => {
    expect(evaluateShot(v, 10, target, tol).status).toBe('short')
    expect(evaluateShot(v, 45, target, tol).status).toBe('far')
  })
})
