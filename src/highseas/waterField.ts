/**
 * Pure helpers for the open-sea water shader. The GLSL in `SeaWater.tsx` mirrors
 * this math; keeping it here makes the shading intent deterministic and
 * unit-testable independent of the GPU.
 */
export type RGB = [number, number, number]

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

/**
 * Schlick-style Fresnel term: 0 looking straight down at the water (`cosTheta`
 * = 1), rising toward 1 at grazing angles (the horizon), so the sea reads as
 * deep near the camera and bright/sky-tinted toward the horizon.
 */
export function fresnel(cosTheta: number, power = 3): number {
  return Math.pow(1 - clamp01(cosTheta), power)
}

/** Blend deep → shallow/horizon sea color by a 0..1 amount (0 = deep). */
export function seaTint(amount: number, deep: RGB, shallow: RGB): RGB {
  const t = clamp01(amount)
  return [
    deep[0] + (shallow[0] - deep[0]) * t,
    deep[1] + (shallow[1] - deep[1]) * t,
    deep[2] + (shallow[2] - deep[2]) * t,
  ]
}

/**
 * World-anchored detail offset (render units) for the water shader, so the
 * surface texture streams past as the floating-origin player sails. Mirrors the
 * `uOrigin` uniform fed to the GLSL.
 */
export function waterOrigin(
  player: { x: number; y: number },
  world: number,
): [number, number] {
  return [(player.x - 0.5) * world, (player.y - 0.5) * world]
}
