import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumericAnswer } from '../components/interactive/shared/NumericAnswer'

describe('NumericAnswer', () => {
  it('renders the label and unit', () => {
    render(
      <NumericAnswer
        label="Maximum height"
        unit="m"
        answered={false}
        submittedValues={null}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByText(/maximum height/i)).toBeInTheDocument()
    expect(screen.getByText('m')).toBeInTheDocument()
  })

  it('calls onSubmit once with the parsed value when submitted', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <NumericAnswer
        label="Speed"
        answered={false}
        submittedValues={null}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByRole('spinbutton'), '42')
    await user.click(screen.getByRole('button'))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith([42])
  })

  it('does not submit non-numeric input', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <NumericAnswer
        label="Speed"
        answered={false}
        submittedValues={null}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole('button'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('hides the submit button and locks once answered', () => {
    render(
      <NumericAnswer
        label="Speed"
        answered={true}
        submittedValues={[7]}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toBeDisabled()
  })
})
