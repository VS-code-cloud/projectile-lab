/** Milliseconds in one day. */
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Returns the epoch milliseconds for the start of the local calendar day that
 * contains the given timestamp.
 * @param ms Epoch milliseconds (UTC).
 */
function startOfLocalDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Computes the number of whole local calendar days between two timestamps.
 * Uses the user's local timezone (timezone switching is out of scope).
 * @param fromMs Earlier timestamp (epoch ms, UTC).
 * @param toMs Later timestamp (epoch ms, UTC).
 * @returns Non-negative count of calendar days between the two dates.
 */
export function localDayDifference(fromMs: number, toMs: number): number {
  const from = startOfLocalDay(fromMs)
  const to = startOfLocalDay(toMs)
  return Math.round((to - from) / DAY_MS)
}
