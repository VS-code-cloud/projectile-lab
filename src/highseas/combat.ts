import { GRAVITY } from '../physics/kinematics'

export function maxRange(muzzleSpeed: number): number {
  return (muzzleSpeed * muzzleSpeed) / GRAVITY
}

export function isInRange(distance: number, muzzleSpeed: number): boolean {
  return distance <= maxRange(muzzleSpeed)
}

export function requiredAngleDeg(
  distance: number,
  muzzleSpeed: number,
): number | null {
  const arg = (GRAVITY * distance) / (muzzleSpeed * muzzleSpeed)
  if (arg > 1) return null
  return (0.5 * Math.asin(arg) * 180) / Math.PI
}

export function aimDelaySeconds(rand: number): number {
  return 0.5 + rand * 1.5
}
