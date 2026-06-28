/**
 * Graphics quality tiering for the open-sea scene. Kept as pure functions so the
 * selection + per-tier settings are deterministic and unit-testable, independent
 * of the renderer. The scene reads these once (quality is stable per session).
 */
export type GraphicsQuality = 'high' | 'low'

/** Heuristic mobile/low-power detection from a user-agent string. */
export function isMobileUserAgent(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent)
}

/** Pick a quality tier. Reduced-motion preference or a mobile device ⇒ `low`. */
export function selectGraphicsQuality(input: {
  reducedMotion: boolean
  mobile: boolean
}): GraphicsQuality {
  return input.reducedMotion || input.mobile ? 'low' : 'high'
}

export interface GraphicsSettings {
  /** Canvas device-pixel-ratio clamp `[min, max]`. */
  dpr: [number, number]
  /** EffectComposer MSAA samples (0 — SMAA does the anti-aliasing on high). */
  multisampling: number
  /** Bloom (glow on bright highlights / foam / sun). */
  bloom: boolean
  /** Brightness/contrast + saturation color grade. */
  colorGrade: boolean
  /** Cinematic vignette. */
  vignette: boolean
  /** Antialiasing via SMAA in the composer. */
  smaa: boolean
}

/** Per-tier rendering settings. `low` strips effects and caps DPR for perf. */
export function graphicsSettings(quality: GraphicsQuality): GraphicsSettings {
  if (quality === 'low') {
    return {
      dpr: [1, 1],
      multisampling: 0,
      bloom: false,
      colorGrade: false,
      vignette: false,
      smaa: false,
    }
  }
  return {
    dpr: [1, 1.5],
    multisampling: 0,
    bloom: true,
    colorGrade: true,
    vignette: true,
    smaa: true,
  }
}
