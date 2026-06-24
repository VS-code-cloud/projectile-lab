import { describe, it, expect } from 'vitest'
import {
  GRAVITY,
  decompose,
  timeToReturn,
  maxHeight,
  rangeFlat,
  timeToGround,
  landingFromHeight,
  positionAt,
} from '../physics/kinematics'

describe('kinematics', () => {
  it('uses g = 9.8 m/s^2', () => {
    expect(GRAVITY).toBe(9.8)
  })

  describe('decompose', () => {
    it('splits a velocity into horizontal and vertical components', () => {
      const { vx, vy } = decompose(10, 30)
      expect(vx).toBeCloseTo(8.660254, 5)
      expect(vy).toBeCloseTo(5, 5)
    })

    it('is purely horizontal at 0 degrees', () => {
      const { vx, vy } = decompose(10, 0)
      expect(vx).toBeCloseTo(10, 5)
      expect(vy).toBeCloseTo(0, 5)
    })

    it('is purely vertical at 90 degrees', () => {
      const { vx, vy } = decompose(10, 90)
      expect(vx).toBeCloseTo(0, 5)
      expect(vy).toBeCloseTo(10, 5)
    })
  })

  describe('timeToReturn', () => {
    it('returns 2*vy/g', () => {
      // vy = 5, so t = 10 / 9.8
      expect(timeToReturn(10, 30)).toBeCloseTo(10 / 9.8, 6)
    })
  })

  describe('maxHeight', () => {
    it('returns vy^2 / (2g)', () => {
      // vy = 5 -> 25 / 19.6
      expect(maxHeight(10, 30)).toBeCloseTo(25 / 19.6, 6)
    })
  })

  describe('rangeFlat', () => {
    it('matches v^2 sin(2 theta) / g', () => {
      const v = 20
      const theta = 45
      const expected = (v * v * Math.sin((2 * theta * Math.PI) / 180)) / GRAVITY
      expect(rangeFlat(v, theta)).toBeCloseTo(expected, 5)
    })

    it('is maximized at 45 degrees', () => {
      expect(rangeFlat(20, 45)).toBeGreaterThan(rangeFlat(20, 30))
      expect(rangeFlat(20, 45)).toBeGreaterThan(rangeFlat(20, 60))
    })
  })

  describe('timeToGround', () => {
    it('equals timeToReturn when h0 is 0', () => {
      expect(timeToGround(10, 30, 0)).toBeCloseTo(timeToReturn(10, 30), 6)
    })

    it('falls straight down from a height when fired horizontally', () => {
      // h0 = 19.6, vy = 0 -> t = sqrt(2h/g) = 2
      expect(timeToGround(5, 0, 19.6)).toBeCloseTo(2, 6)
    })

    it('takes longer to land from a greater height', () => {
      expect(timeToGround(10, 30, 50)).toBeGreaterThan(timeToGround(10, 30, 0))
    })
  })

  describe('landingFromHeight', () => {
    it('is horizontal speed times the time to ground', () => {
      const v = 15
      const theta = 20
      const h0 = 30
      const { vx } = decompose(v, theta)
      expect(landingFromHeight(v, theta, h0)).toBeCloseTo(
        vx * timeToGround(v, theta, h0),
        5,
      )
    })
  })

  describe('positionAt', () => {
    it('starts at the launch point plus h0 when t = 0', () => {
      const p = positionAt(10, 30, 0, 5)
      expect(p.x).toBeCloseTo(0, 6)
      expect(p.y).toBeCloseTo(5, 6)
    })

    it('follows x = vx*t and y = h0 + vy*t - 0.5 g t^2', () => {
      const v = 10
      const theta = 30
      const t = 0.5
      const h0 = 2
      const { vx, vy } = decompose(v, theta)
      const p = positionAt(v, theta, t, h0)
      expect(p.x).toBeCloseTo(vx * t, 6)
      expect(p.y).toBeCloseTo(h0 + vy * t - 0.5 * GRAVITY * t * t, 6)
    })

    it('defaults h0 to 0', () => {
      const p = positionAt(10, 90, 1)
      // vy = 10, y = 10 - 4.9 = 5.1
      expect(p.y).toBeCloseTo(5.1, 6)
    })
  })
})
