import { describe, expect, it } from 'vitest'
import {
  graphicsSettings,
  isMobileUserAgent,
  selectGraphicsQuality,
} from '../highseas/graphicsQuality'

describe('selectGraphicsQuality', () => {
  it('is high on a desktop with motion enabled', () => {
    expect(selectGraphicsQuality({ reducedMotion: false, mobile: false })).toBe('high')
  })

  it('drops to low when reduced motion is preferred', () => {
    expect(selectGraphicsQuality({ reducedMotion: true, mobile: false })).toBe('low')
  })

  it('drops to low on a mobile device', () => {
    expect(selectGraphicsQuality({ reducedMotion: false, mobile: true })).toBe('low')
  })
})

describe('isMobileUserAgent', () => {
  it('detects iOS and Android user agents', () => {
    expect(isMobileUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(isMobileUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(true)
  })

  it('treats a desktop user agent as non-mobile', () => {
    expect(
      isMobileUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120'),
    ).toBe(false)
  })
})

describe('graphicsSettings', () => {
  it('enables the full effect stack + SMAA at 1.5 DPR on high', () => {
    const s = graphicsSettings('high')
    expect(s.bloom).toBe(true)
    expect(s.colorGrade).toBe(true)
    expect(s.vignette).toBe(true)
    expect(s.smaa).toBe(true)
    expect(s.dpr).toEqual([1, 1.5])
    // SMAA handles anti-aliasing, so MSAA stays off to avoid double-cost.
    expect(s.multisampling).toBe(0)
  })

  it('strips effects and caps DPR at 1 on low', () => {
    const s = graphicsSettings('low')
    expect(s.bloom).toBe(false)
    expect(s.colorGrade).toBe(false)
    expect(s.vignette).toBe(false)
    expect(s.smaa).toBe(false)
    expect(s.dpr).toEqual([1, 1])
  })
})
