import type { Step } from '../lessons/types'

/** Guards against floating-point comparison noise after rounding. */
const EPSILON = 1e-9

function decimalPlaces(value: number): number {
  if (Number.isInteger(value)) return 0
  const text = value.toString()
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

/**
 * Compares one submitted value to an expected answer, rounding the submission to
 * the expected value's precision first (so `0.333` matches an expected `0.3`).
 * Shared by lesson grading and AI practice grading so both behave identically.
 */
export function matchesExpected(expected: number, value: number): boolean {
  const factor = Math.pow(10, decimalPlaces(expected))
  const rounded = Math.round(value * factor) / factor
  return Math.abs(rounded - expected) <= EPSILON
}

/** Checks a user's submitted values against a step's expected answers. */
export function checkAnswer(step: Step, values: number[]): boolean {
  if (values.length !== step.expected.length) return false
  return step.expected.every((expected, i) => matchesExpected(expected, values[i]))
}
