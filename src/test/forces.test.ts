import { describe, expect, it } from 'vitest'
import {
  acceleration,
  netForce,
  normalForceFlat,
  weight,
} from '../physics/forces'

describe('weight', () => {
  it('multiplies mass by g (9.8)', () => {
    expect(weight(5)).toBeCloseTo(49)
    expect(weight(10)).toBeCloseTo(98)
  })
})

describe('normalForceFlat', () => {
  it('equals the weight on level ground with no extra push', () => {
    expect(normalForceFlat(5)).toBeCloseTo(49)
  })

  it('increases by a downward push', () => {
    expect(normalForceFlat(5, 20)).toBeCloseTo(69)
  })

  it('decreases with an upward pull and never goes negative', () => {
    expect(normalForceFlat(5, -20)).toBeCloseTo(29)
    expect(normalForceFlat(5, -100)).toBe(0)
  })
})

describe('netForce', () => {
  it('sums opposing forces with sign', () => {
    expect(netForce([30, -12])).toBe(18)
  })

  it('returns 0 for balanced forces', () => {
    expect(netForce([15, -15])).toBe(0)
  })
})

describe('acceleration', () => {
  it('applies Newton\'s second law a = F/m', () => {
    expect(acceleration(20, 4)).toBe(5)
  })
})
