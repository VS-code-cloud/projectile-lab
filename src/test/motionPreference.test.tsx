import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionPreferenceProvider } from '../context/MotionPreferenceProvider'
import { useMotionPreference } from '../hooks/useMotionPreference'
import { MOTION_STORAGE_KEY } from '../context/motionContext'

/** Tiny consumer that surfaces the context state and lets tests change it. */
function Probe() {
  const { preference, animationsEnabled, reduced, setPreference } =
    useMotionPreference()
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="anim">{String(animationsEnabled)}</span>
      <span data-testid="reduced">{String(reduced)}</span>
      <button type="button" onClick={() => setPreference('reduced')}>
        go-reduced
      </button>
      <button type="button" onClick={() => setPreference('off')}>
        go-off
      </button>
    </div>
  )
}

describe('MotionPreference', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.motion
  })
  afterEach(() => {
    window.localStorage.clear()
  })

  it('defaults to full motion and mirrors it onto <html data-motion>', () => {
    render(
      <MotionPreferenceProvider>
        <Probe />
      </MotionPreferenceProvider>,
    )
    expect(screen.getByTestId('pref')).toHaveTextContent('full')
    expect(screen.getByTestId('anim')).toHaveTextContent('true')
    expect(screen.getByTestId('reduced')).toHaveTextContent('false')
    expect(document.documentElement.dataset.motion).toBe('full')
  })

  it('initializes from a previously persisted preference', () => {
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'reduced')
    render(
      <MotionPreferenceProvider>
        <Probe />
      </MotionPreferenceProvider>,
    )
    expect(screen.getByTestId('pref')).toHaveTextContent('reduced')
    expect(screen.getByTestId('anim')).toHaveTextContent('false')
    expect(screen.getByTestId('reduced')).toHaveTextContent('true')
    expect(document.documentElement.dataset.motion).toBe('reduced')
  })

  it('persists an explicit choice and updates the html attribute + flags', async () => {
    const user = userEvent.setup()
    render(
      <MotionPreferenceProvider>
        <Probe />
      </MotionPreferenceProvider>,
    )

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'go-off' }))
    })

    expect(screen.getByTestId('pref')).toHaveTextContent('off')
    expect(screen.getByTestId('anim')).toHaveTextContent('false')
    expect(screen.getByTestId('reduced')).toHaveTextContent('true')
    expect(document.documentElement.dataset.motion).toBe('off')
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBe('off')
  })
})
