import { describe, expect, it } from 'vitest'
import { fresnel, seaTint, waterOrigin, type RGB } from '../highseas/waterField'

describe('fresnel', () => {
  it('is 0 looking straight on and 1 at grazing angle', () => {
    expect(fresnel(1)).toBeCloseTo(0, 6)
    expect(fresnel(0)).toBeCloseTo(1, 6)
  })

  it('increases monotonically as the view angle grazes', () => {
    expect(fresnel(0.25)).toBeGreaterThan(fresnel(0.75))
  })

  it('clamps out-of-range cosines', () => {
    expect(fresnel(1.5)).toBe(0)
    expect(fresnel(-0.5)).toBe(1)
  })
})

describe('seaTint', () => {
  // Use powers-of-two fractions so the interpolation is float-exact.
  const deep: RGB = [0, 0, 0]
  const shallow: RGB = [1, 0.5, 0.25]

  it('returns the deep color at 0 and shallow at 1', () => {
    expect(seaTint(0, deep, shallow)).toEqual(deep)
    expect(seaTint(1, deep, shallow)).toEqual(shallow)
  })

  it('interpolates halfway at 0.5', () => {
    expect(seaTint(0.5, deep, shallow)).toEqual([0.5, 0.25, 0.125])
  })

  it('clamps the blend amount', () => {
    expect(seaTint(2, deep, shallow)).toEqual(shallow)
    expect(seaTint(-1, deep, shallow)).toEqual(deep)
  })
})

describe('waterOrigin', () => {
  it('maps the centered player to the world origin', () => {
    expect(waterOrigin({ x: 0.5, y: 0.5 }, 275000)).toEqual([0, 0])
  })

  it('offsets by the player world position so detail streams while sailing', () => {
    // 0.75/0.25 chosen so the ×275000 scaling stays float-exact.
    expect(waterOrigin({ x: 0.75, y: 0.25 }, 275000)).toEqual([68750, -68750])
  })
})
