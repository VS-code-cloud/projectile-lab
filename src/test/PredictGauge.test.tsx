import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PredictGauge } from '../components/interactive/shared/PredictGauge'

describe('PredictGauge', () => {
  it('renders the prompt and prediction readout while unanswered', () => {
    render(
      <PredictGauge
        label="Predict the final velocity"
        unit="m/s"
        max={30}
        trueValue={17}
        decimals={0}
        answered={false}
        submittedValue={null}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByText(/predict the final velocity/i)).toBeInTheDocument()
    expect(screen.getByText(/your prediction/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /lock in prediction/i }),
    ).toBeInTheDocument()
    // The true answer must not be revealed before submitting.
    expect(screen.queryByText(/actual answer/i)).not.toBeInTheDocument()
  })

  it('starts the thumb off the answer (at ~30% of scale, never trivially correct)', () => {
    render(
      <PredictGauge
        label="Predict the acceleration"
        unit="m/s"
        max={30}
        trueValue={20}
        decimals={0}
        answered={false}
        submittedValue={null}
        onSubmit={vi.fn()}
      />,
    )
    // round(30 * 0.3) = 9, which is far from the true value of 20.
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '9')
  })

  it('calls onSubmit once with a number when the prediction is locked in', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <PredictGauge
        label="Predict the acceleration"
        unit="m/s"
        max={9}
        trueValue={5}
        decimals={0}
        answered={false}
        submittedValue={null}
        onSubmit={onSubmit}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /lock in prediction/i }),
    )
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(typeof onSubmit.mock.calls[0][0]).toBe('number')
  })

  it('reveals the actual answer and hides the button once answered', () => {
    render(
      <PredictGauge
        label="Predict the period"
        unit="s"
        max={6}
        trueValue={3.1}
        decimals={1}
        answered={true}
        submittedValue={2.4}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByText(/actual answer/i)).toBeInTheDocument()
    expect(screen.getByText('3.1')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /lock in prediction/i }),
    ).not.toBeInTheDocument()
  })
})
