/**
 * Pure math for the ship's wake (the foam trail it leaves while sailing). Kept
 * out of the R3F component so it is deterministic and unit-testable: the
 * `SeaWake` component just maps these values onto a trailing foam ribbon + bow
 * spray each frame. `speed` is the ship's normalized sail speed; `maxSpeed` is
 * `MAX_SAIL_SPEED`.
 */

/** 0 at rest → 1 at (or above) top speed. Reversing still churns foam. */
export function wakeIntensity(speed: number, maxSpeed: number): number {
  if (maxSpeed <= 0) return 0
  return Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed))
}

/** Trailing foam length (render units) for a given intensity. */
export function wakeLength(
  intensity: number,
  minLength: number,
  maxLength: number,
): number {
  const t = Math.max(0, Math.min(1, intensity))
  return minLength + (maxLength - minLength) * t
}

/**
 * Foam opacity for a given intensity, eased so a barely-moving ship shows almost
 * no wake and the foam ramps in as it gets underway.
 */
export function wakeOpacity(intensity: number, maxOpacity = 0.85): number {
  const t = Math.max(0, Math.min(1, intensity))
  // Smoothstep so low speeds stay calm and the foam builds nonlinearly.
  const eased = t * t * (3 - 2 * t)
  return eased * maxOpacity
}
