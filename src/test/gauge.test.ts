import { describe, it, expect } from 'vitest'
import { niceGaugeMax } from '../components/interactive/shared/gauge'

describe('niceGaugeMax', () => {
  it('buckets small values by ceiling (raw = value*1.7 <= 12)', () => {
    expect(niceGaugeMax(5)).toBe(9) // 8.5 -> 9
    expect(niceGaugeMax(6)).toBe(11) // 10.2 -> 11
    expect(niceGaugeMax(3.1)).toBe(6) // 5.27 -> 6
    expect(niceGaugeMax(4.9)).toBe(9) // 8.33 -> 9
  })

  it('rounds medium values up to the nearest 5 (raw <= 60)', () => {
    expect(niceGaugeMax(17)).toBe(30) // 28.9 -> 30
    expect(niceGaugeMax(20)).toBe(35) // 34 -> 35
    expect(niceGaugeMax(21)).toBe(40) // 35.7 -> 40
  })

  it('rounds large values up to the nearest 10 (raw > 60)', () => {
    expect(niceGaugeMax(40)).toBe(70) // 68 -> 70
    expect(niceGaugeMax(65)).toBe(120) // 110.5 -> 120
  })

  it('always returns a maximum >= the value', () => {
    for (const v of [1, 3.1, 4.9, 5, 6, 9.8, 9.9, 17, 18, 20, 40, 65, 100]) {
      expect(niceGaugeMax(v)).toBeGreaterThanOrEqual(v)
    }
  })
})
