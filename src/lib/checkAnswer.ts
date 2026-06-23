import type { Step } from '../lessons/types'

/** Guards against floating-point comparison noise. */
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
 * Derives the allowed absolute error for an expected value: an explicit
 * tolerance when provided, otherwise one unit in the value's last decimal place
 * ("within 1 rounding error").
 * @param step The step being checked.
 * @param index Index of the expected value.
 */
function toleranceFor(step: Step, index: number): number {
  if (step.tolerance && step.tolerance[index] !== undefined) {
    return step.tolerance[index]
  }
  return Math.pow(10, -decimalPlaces(step.expected[index]))
}

/**
 * Checks a user's submitted values against a step's expected answer, allowing
 * up to one rounding error per value.
 * @param step The question step.
 * @param values The user's submitted numeric values.
 * @returns True if every value is within tolerance of the expected value.
 */
export function checkAnswer(step: Step, values: number[]): boolean {
  if (values.length !== step.expected.length) return false
  return step.expected.every((expected, i) => {
    const tolerance = toleranceFor(step, i)
    return Math.abs(values[i] - expected) <= tolerance + EPSILON
  })
}
