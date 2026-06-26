export interface PracticeTopic {
  id: string
  name: string
  focus: string
  hint: string
  unitSuggestions: string[]
}

const PRACTICE_TOPICS_BY_LESSON: Record<string, PracticeTopic[]> = {
  'kinematics-1d': [
    {
      id: 'final-velocity',
      name: 'Final velocity',
      focus: 'Use initial velocity, acceleration, and time to find final velocity.',
      hint: 'Start with v = v0 + at.',
      unitSuggestions: ['m/s'],
    },
    {
      id: 'displacement',
      name: 'Displacement',
      focus: 'Use constant acceleration to find displacement over time.',
      hint: 'Start with x = v0t + 0.5at^2.',
      unitSuggestions: ['m'],
    },
    {
      id: 'braking',
      name: 'Braking distance',
      focus: 'Find stopping distance from initial speed and acceleration.',
      hint: 'Start with v^2 = v0^2 + 2aΔx and set v = 0.',
      unitSuggestions: ['m'],
    },
    {
      id: 'acceleration',
      name: 'Acceleration',
      focus: 'Find acceleration from a change in velocity over time.',
      hint: 'Start with a = Δv / Δt.',
      unitSuggestions: ['m/s^2'],
    },
    {
      id: 'time',
      name: 'Time from velocity change',
      focus: 'Find elapsed time from velocity change and acceleration.',
      hint: 'Rearrange v = v0 + at.',
      unitSuggestions: ['s'],
    },
  ],
  'projectile-2d': [
    {
      id: 'components',
      name: 'Velocity components',
      focus: 'Resolve a launch velocity into horizontal and vertical components.',
      hint: 'Start with vx = v cos(theta), vy = v sin(theta).',
      unitSuggestions: ['m/s'],
    },
    {
      id: 'time-of-flight',
      name: 'Time of flight',
      focus: 'Find same-height projectile flight time.',
      hint: 'Start with t = 2vy / g.',
      unitSuggestions: ['s'],
    },
    {
      id: 'max-height',
      name: 'Maximum height',
      focus: 'Find height gained from the vertical launch velocity.',
      hint: 'Start with H = vy^2 / 2g.',
      unitSuggestions: ['m'],
    },
    {
      id: 'range',
      name: 'Horizontal range',
      focus: 'Find horizontal distance from horizontal speed and time.',
      hint: 'Start with x = vx t.',
      unitSuggestions: ['m'],
    },
    {
      id: 'cliff',
      name: 'Cliff landing',
      focus: 'Find landing time and horizontal distance from an elevated launch.',
      hint: 'Start with y = h0 + vyt - 0.5gt^2.',
      unitSuggestions: ['m'],
    },
  ],
  'newtons-second-law': [
    {
      id: 'acceleration',
      name: 'Acceleration from force',
      focus: 'Find acceleration from net force and mass.',
      hint: 'Start with F = ma.',
      unitSuggestions: ['m/s^2'],
    },
    {
      id: 'force',
      name: 'Net force',
      focus: 'Find net force from mass and acceleration.',
      hint: 'Start with F = ma.',
      unitSuggestions: ['N'],
    },
    {
      id: 'mass',
      name: 'Mass from force and acceleration',
      focus: 'Find mass from net force and acceleration.',
      hint: 'Rearrange F = ma.',
      unitSuggestions: ['kg'],
    },
    {
      id: 'compare-masses',
      name: 'Comparing masses',
      focus: 'Compare acceleration when the same force acts on different masses.',
      hint: 'For the same force, acceleration is inversely proportional to mass.',
      unitSuggestions: ['m/s^2'],
    },
    {
      id: 'net-force',
      name: 'Combining forces',
      focus: 'Use opposing forces to find net force before applying F = ma.',
      hint: 'Find Fnet first, then use Fnet = ma.',
      unitSuggestions: ['m/s^2', 'N'],
    },
  ],
  'inclined-planes': [
    {
      id: 'ramp-acceleration',
      name: 'Ramp acceleration',
      focus: 'Find acceleration down a frictionless ramp.',
      hint: 'Start with a = g sin(theta).',
      unitSuggestions: ['m/s^2'],
    },
    {
      id: 'normal-force',
      name: 'Normal force',
      focus: 'Find the normal force on a block on an incline.',
      hint: 'Start with N = mg cos(theta).',
      unitSuggestions: ['N'],
    },
    {
      id: 'parallel-component',
      name: 'Gravity along the ramp',
      focus: 'Find the component of weight parallel to the incline.',
      hint: 'Start with F_parallel = mg sin(theta).',
      unitSuggestions: ['N'],
    },
    {
      id: 'speed-bottom',
      name: 'Speed at the bottom',
      focus: 'Find final speed after sliding from rest down a ramp.',
      hint: 'Start with v^2 = 2aL.',
      unitSuggestions: ['m/s'],
    },
    {
      id: 'angle-comparison',
      name: 'Angle comparison',
      focus: 'Compare how ramp angle changes acceleration or force components.',
      hint: 'sin(theta) controls the downhill component.',
      unitSuggestions: ['m/s^2', 'N'],
    },
  ],
  'uniform-circular-motion': [
    {
      id: 'centripetal-acceleration',
      name: 'Centripetal acceleration',
      focus: 'Find inward acceleration from speed and radius.',
      hint: 'Start with a_c = v^2 / r.',
      unitSuggestions: ['m/s^2'],
    },
    {
      id: 'centripetal-force',
      name: 'Centripetal force',
      focus: 'Find the inward force required for circular motion.',
      hint: 'Start with F_c = mv^2 / r.',
      unitSuggestions: ['N'],
    },
    {
      id: 'period',
      name: 'Period',
      focus: 'Find the time for one revolution from radius and speed.',
      hint: 'Start with T = 2πr / v.',
      unitSuggestions: ['s'],
    },
    {
      id: 'speed',
      name: 'Speed from acceleration',
      focus: 'Find speed from centripetal acceleration and radius.',
      hint: 'Rearrange a_c = v^2 / r.',
      unitSuggestions: ['m/s'],
    },
    {
      id: 'radius',
      name: 'Radius from speed and acceleration',
      focus: 'Find circular radius from speed and centripetal acceleration.',
      hint: 'Rearrange a_c = v^2 / r.',
      unitSuggestions: ['m'],
    },
  ],
}

export function getPracticeTopics(lessonUid: string): PracticeTopic[] {
  return PRACTICE_TOPICS_BY_LESSON[lessonUid] ?? []
}
