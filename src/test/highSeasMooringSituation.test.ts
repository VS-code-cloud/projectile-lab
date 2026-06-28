import { describe, expect, it } from 'vitest'
import { evaluateKedge } from '../lib/kedgeGame'
import { generateMooringSituation, mooringNetForce } from '../highseas/mooringSituation'
import { mulberry32 } from '../highseas/rng'

describe('generateMooringSituation', () => {
  it('always produces a solvable situation across many seeds', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const s = generateMooringSituation(mulberry32(seed))

      // The runtime-computed answer must score a clean hit.
      expect(mooringNetForce(s, s.correctHaul)).toBe(s.targetNet)
      expect(evaluateKedge(s.correctHaul, s.windForce, s.currentForce, s.targetNet, s.tolerance).status).toBe('hit')

      // Reasonable, signed ranges so the situation reads correctly.
      expect(s.windForce).toBeLessThan(0)
      expect(s.currentForce).toBeGreaterThan(0)
      expect(s.targetNet).toBeGreaterThan(0)
      expect(s.tolerance).toBeGreaterThan(0)

      // The answer stays inside the game's accepted rope-pull input window.
      expect(s.correctHaul).toBeGreaterThanOrEqual(-500)
      expect(s.correctHaul).toBeLessThanOrEqual(800)
    }
  })

  it('varies between different seeds', () => {
    const a = generateMooringSituation(mulberry32(1))
    const b = generateMooringSituation(mulberry32(99))
    expect(a).not.toEqual(b)
  })

  it('defaults to Math.random when no rng is supplied', () => {
    const s = generateMooringSituation()
    expect(mooringNetForce(s, s.correctHaul)).toBe(s.targetNet)
  })
})
