/** Whether a step is a passive demonstration or an interactive question. */
export type StepType = 'demo' | 'question'

/** A single lesson step, referencing an interactive component by name. */
export interface Step {
  /** Unique step identifier within the lesson. */
  uid: string
  /** Step kind: demonstration (completed on view) or question (completed on answer). */
  stepType: StepType
  /** Markdown-free instructional text shown above the interactive area. */
  displayText: string
  /** Registry key naming the interactive React component to render. */
  interactiveComponent: string
  /** Expected answer values. Defaults to [0] for demonstrations. */
  expected: number[]
  /** Explanation shown when an answer is wrong. Empty for demonstrations. */
  explanation: string
  /**
   * Allowed absolute error per expected value ("within 1 rounding error").
   * When omitted, tolerance is inferred from each value's decimal places.
   */
  tolerance?: number[]
  /**
   * Scenario parameters consumed by the interactive component (e.g. launch
   * speed, angle, cliff height). Keeps the engine data-driven.
   */
  params?: Record<string, number>
  /**
   * Reference equations rendered by an equation step (the EquationReference
   * component). Each entry pairs a formula with a short plain-language label.
   */
  equations?: { formula: string; label: string }[]
}

/** A structured lesson: an ordered array of steps plus display metadata. */
export interface Lesson {
  /** Unique lesson identifier. */
  uid: string
  /** Human-readable lesson title. */
  displayName: string
  /** Short lesson description shown on the home page and lesson intro. */
  text: string
  /** Ordered steps. The array length is the total number of steps. */
  steps: Step[]
}

/**
 * Counts the number of question steps in a lesson.
 * @param lesson The lesson to inspect.
 */
export function countQuestions(lesson: Lesson): number {
  return lesson.steps.filter((step) => step.stepType === 'question').length
}

/** Props passed to every interactive step component. */
export interface StepComponentProps {
  /** The step being rendered. */
  step: Step
  /** True once an answer has been submitted (question steps lock after one). */
  answered: boolean
  /** The user's submitted values, or null if not yet answered. */
  submittedValues: number[] | null
  /** Whether the submitted answer was correct, or null before answering. */
  isCorrect: boolean | null
  /**
   * Submit handler for question steps. Demonstration components do not call it.
   * @param values The numeric answer values to record.
   */
  onSubmit: (values: number[]) => void
}
