import { describe, expect, it } from 'vitest'
import { classifyBand, evaluateBand } from '../lib/navalChallenge'

describe('classifyBand', () => {
  const target = 100
  const tol = 5

  it('treats the band bounds as inclusive hits', () => {
    expect(classifyBand(95, target, tol)).toBe('hit')
    expect(classifyBand(100, target, tol)).toBe('hit')
    expect(classifyBand(105, target, tol)).toBe('hit')
  })

  it('flags values below the band as short', () => {
    expect(classifyBand(94.9, target, tol)).toBe('short')
    expect(classifyBand(0, target, tol)).toBe('short')
  })

  it('flags values above the band as far', () => {
    expect(classifyBand(105.1, target, tol)).toBe('far')
    expect(classifyBand(1000, target, tol)).toBe('far')
  })
})

describe('evaluateBand', () => {
  it('packages the value with its classification', () => {
    expect(evaluateBand(100, 100, 5)).toEqual({ value: 100, status: 'hit' })
    expect(evaluateBand(80, 100, 5)).toEqual({ value: 80, status: 'short' })
    expect(evaluateBand(120, 100, 5)).toEqual({ value: 120, status: 'far' })
  })
})
