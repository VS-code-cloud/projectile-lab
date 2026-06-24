import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MasteryBar } from '../components/MasteryBar'

describe('MasteryBar', () => {
  it('shows the steps progress text', () => {
    const { container } = render(
      <MasteryBar
        stepsCompleted={3}
        totalSteps={4}
        numCorrect={2}
        totalQuestions={4}
      />,
    )
    expect(container).toHaveTextContent(/3\s*\/\s*4\s*steps/)
  })

  it('shows the mastery percentage from question steps', () => {
    render(
      <MasteryBar
        stepsCompleted={3}
        totalSteps={4}
        numCorrect={2}
        totalQuestions={4}
      />,
    )
    // 2 / 4 -> 50%
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('exposes a progressbar with aria-valuenow equal to the step percentage', () => {
    render(
      <MasteryBar
        stepsCompleted={3}
        totalSteps={4}
        numCorrect={1}
        totalQuestions={4}
      />,
    )
    const bar = screen.getByRole('progressbar')
    // 3 / 4 -> 75
    expect(bar).toHaveAttribute('aria-valuenow', '75')
  })

  it('guards against divide-by-zero when there are no questions', () => {
    render(
      <MasteryBar
        stepsCompleted={0}
        totalSteps={4}
        numCorrect={0}
        totalQuestions={0}
      />,
    )
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })
})
