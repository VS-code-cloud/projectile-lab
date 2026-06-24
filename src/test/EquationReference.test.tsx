import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import EquationReference from '../components/interactive/EquationReference'
import type { Step, StepComponentProps } from '../lessons/types'

/** Builds props for a demo step that carries reference equations. */
function makeProps(
  equations: { formula: string; label: string }[],
): StepComponentProps {
  const step: Step = {
    uid: 'eq',
    stepType: 'demo',
    displayText: 'Reference equations',
    interactiveComponent: 'EquationReference',
    expected: [0],
    explanation: '',
    equations,
  }
  return {
    step,
    answered: false,
    submittedValues: null,
    isCorrect: null,
    onSubmit: vi.fn(),
  }
}

describe('EquationReference', () => {
  it('renders each formula and its label', () => {
    const equations = [
      { formula: 'v = u + at', label: 'Velocity over time' },
      { formula: 'R = v^2 sin(2θ) / g', label: 'Range on flat ground' },
    ]
    render(<EquationReference {...makeProps(equations)} />)

    for (const eq of equations) {
      expect(screen.getByText(eq.formula)).toBeInTheDocument()
      expect(screen.getByText(eq.label)).toBeInTheDocument()
    }
  })

  it('renders nothing problematic when there are no equations', () => {
    const { container } = render(<EquationReference {...makeProps([])} />)
    expect(container).toBeInTheDocument()
  })
})
