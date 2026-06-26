/** Whether a step is a passive demonstration, graded question, or neutral prompt. */
export type StepType = 'demo' | 'question' | 'pretrieval'

/** Where a step appears in the lesson flow. */
export type LessonSection = 'pretrieval' | 'lesson' | 'retrieval'

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
  /** Explanation or neutral note shown after a response. Empty for demonstrations. */
  explanation: string
  /**
   * Optional learner-facing hint for question steps, revealed on demand via the
   * hint button. Should nudge toward the approach without giving the answer.
   */
  hint?: string
  /**
   * @deprecated Ignored by grading. Answers must match expected values exactly
   * after rounding to the same decimal precision.
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
  /**
   * Question variant key. Selects which quantity a question asks about (e.g.
   * "velocity" vs "distance") so a single component can drive several steps.
   */
  variant?: string
  /** Multiple-choice options used by neutral conceptual pretrieval prompts. */
  options?: string[]
  /** Flow section. Derived for authored `pretrieval` and `retrieval` arrays. */
  section?: LessonSection
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
  /** Neutral conceptual prompts shown before the core lesson. */
  pretrieval?: Step[]
  /** Extra practice problems shown after the core lesson. */
  retrieval?: Step[]
}

/** Returns the required lesson sequence: pretrieval followed by core lesson steps. */
export function getLessonFlow(lesson: Lesson): Step[] {
  return [
    ...(lesson.pretrieval ?? []).map((step) => ({
      ...step,
      section: 'pretrieval' as const,
    })),
    ...lesson.steps.map((step) => ({ ...step, section: 'lesson' as const })),
  ]
}

/** Returns optional retrieval practice steps, separate from lesson completion. */
export function getRetrievalPractice(lesson: Lesson): Step[] {
  return (lesson.retrieval ?? []).map((step) => ({
    ...step,
    section: 'retrieval' as const,
  }))
}

/**
 * Counts required lesson steps, excluding optional retrieval practice.
 * @param lesson The lesson to inspect.
 */
export function countLessonSteps(lesson: Lesson): number {
  return getLessonFlow(lesson).length
}

/**
 * Counts graded questions in the required lesson sequence.
 * @param lesson The lesson to inspect.
 */
export function countQuestions(lesson: Lesson): number {
  return getLessonFlow(lesson).filter((step) => step.stepType === 'question')
    .length
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
