import type { Step } from '../lessons/types'

/** Guards against floating-point comparison noise after rounding. */
const EPSILON = 1e-9

/**
 * Counts the number of decimal places represented by a number.
 * @param value The number to inspect.
 */
function decimalPlaces(value: number): number {
  if (Number.isInteger(value)) return 0
  const text = value.toString()
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

/**
 * Rounds a value to a fixed number of decimal places.
 * @param value The value to round.
 * @param places How many decimal places to keep.
 */
function roundToPlaces(value: number, places: number): number {
  const factor = Math.pow(10, places)
  return Math.round(value * factor) / factor
}

/**
 * Checks a user's submitted values against a step's expected answer.
 * Each submitted value is rounded to the same precision as the corresponding
 * expected value, then compared for exact equality (with EPSILON for float noise).
 * The `tolerance` field on the step is ignored.
 * @param step The question step.
 * @param values The user's submitted numeric values.
 * @returns True if every rounded value equals the expected value.
 */
export function checkAnswer(step: Step, values: number[]): boolean {
  if (values.length !== step.expected.length) return false
  return step.expected.every((expected, i) => {
    const rounded = roundToPlaces(values[i], decimalPlaces(expected))
    return Math.abs(rounded - expected) <= EPSILON
  })
}
