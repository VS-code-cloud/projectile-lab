import { describe, expect, it } from 'vitest'
import { mulberry32, nextSeed } from '../highseas/rng'

describe('mulberry32', () => {
  it('is deterministic for a fixed seed', () => {
    const rand1 = mulberry32(12345)
    const rand2 = mulberry32(12345)
    const seq1 = [rand1(), rand1(), rand1(), rand1(), rand1()]
    const seq2 = [rand2(), rand2(), rand2(), rand2(), rand2()]
    expect(seq1).toEqual(seq2)
  })

  it('returns values in [0, 1)', () => {
    const rand = mulberry32(42)
    for (let i = 0; i < 200; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('nextSeed', () => {
  it('is deterministic and differs from input', () => {
    const next = nextSeed(12345)
    expect(nextSeed(12345)).toBe(next)
    expect(next).not.toBe(12345)
  })
})
