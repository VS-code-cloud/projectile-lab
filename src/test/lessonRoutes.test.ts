import { describe, expect, it } from 'vitest'
import { getLessonPath, getPracticePath } from '../lib/lessonRoutes'

describe('lesson route helpers', () => {
  it('keeps practice on a separate route from the lesson player', () => {
    expect(getLessonPath('kinematics-1d')).toBe('/lesson/kinematics-1d')
    expect(getPracticePath('kinematics-1d')).toBe(
      '/lesson/kinematics-1d/practice',
    )
  })
})
