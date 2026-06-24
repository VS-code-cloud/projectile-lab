/**
 * Rounds up to a clean gauge maximum that keeps the true value comfortably
 * mid-scale, leaving room to over- or under-predict.
 * @param value The correct answer the gauge must contain.
 */
export function niceGaugeMax(value: number): number {
  const raw = Math.abs(value) * 1.7
  if (raw <= 12) return Math.max(1, Math.ceil(raw))
  if (raw <= 60) return Math.ceil(raw / 5) * 5
  return Math.ceil(raw / 10) * 10
}
