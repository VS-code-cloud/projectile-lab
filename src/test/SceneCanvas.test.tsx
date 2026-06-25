import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { SceneCanvas } from '../components/interactive/shared/SceneCanvas'
import { MotionPreferenceProvider } from '../context/MotionPreferenceProvider'
import { MOTION_STORAGE_KEY } from '../context/motionContext'

/**
 * jsdom has no real 2D canvas or ResizeObserver, so we stub the minimal surface
 * SceneCanvas touches and spy on requestAnimationFrame to observe loop wiring.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let rafSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  // Return a stable id but never actually schedule, so loops don't run away.
  rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('SceneCanvas motion gating', () => {
  it('renders a single static frame for a looping scene when motion is off', () => {
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'off')
    const draw = vi.fn()
    render(
      <MotionPreferenceProvider>
        <SceneCanvas draw={draw} loop reducedStaticT={1.5} />
      </MotionPreferenceProvider>,
    )
    // One static render, and crucially no animation loop scheduled.
    expect(draw).toHaveBeenCalledTimes(1)
    expect(draw.mock.calls[0][3]).toBe(1.5)
    expect(rafSpy).not.toHaveBeenCalled()
  })

  it('drives a requestAnimationFrame loop for a looping scene under full motion', () => {
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'full')
    const draw = vi.fn()
    render(
      <MotionPreferenceProvider>
        <SceneCanvas draw={draw} loop />
      </MotionPreferenceProvider>,
    )
    expect(rafSpy).toHaveBeenCalled()
  })

  it('still animates a user-triggered one-shot (playToken) when motion is off', () => {
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'off')
    const draw = vi.fn()
    render(
      <MotionPreferenceProvider>
        <SceneCanvas draw={draw} playToken={1} />
      </MotionPreferenceProvider>,
    )
    // The one-shot path schedules an animation frame regardless of preference.
    expect(rafSpy).toHaveBeenCalled()
  })
})
