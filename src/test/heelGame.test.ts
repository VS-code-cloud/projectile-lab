import { describe, expect, it } from 'vitest'
import { arrivalSpeed, evaluateHeel } from '../lib/heelGame'

describe('arrivalSpeed', () => {
  it('computes speed at the gun port for θ=30°, L=5 m', () => {
    expect(arrivalSpeed(30, 5)).toBeCloseTo(7.0, 1)
  })
})

describe('evaluateHeel (L=5, target=7, tolerance=0.4)', () => {
  it('accepts the intended heel angle', () => {
    expect(evaluateHeel(30, 5, 7, 0.4).status).toBe('hit')
  })

  it('flags too shallow a heel as short', () => {
    expect(evaluateHeel(25, 5, 7, 0.4).status).toBe('short')
  })

  it('flags too steep a heel as far', () => {
    expect(evaluateHeel(35, 5, 7, 0.4).status).toBe('far')
  })
})
