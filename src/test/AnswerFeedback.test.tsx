import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnswerFeedback } from '../components/AnswerFeedback'

describe('AnswerFeedback', () => {
  it('renders a positive status message when correct', () => {
    render(<AnswerFeedback correct={true} explanation="ignored when correct" />)
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent(/great work/i)
    expect(screen.queryByText('ignored when correct')).not.toBeInTheDocument()
  })

  it('renders the supplied explanation when incorrect', () => {
    const explanation = 'Remember to decompose the velocity first.'
    render(<AnswerFeedback correct={false} explanation={explanation} />)
    expect(screen.getByText(explanation)).toBeInTheDocument()
  })
})
