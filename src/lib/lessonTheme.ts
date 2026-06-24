/** Visual theme (accent classes) for a lesson, keyed by lesson uid. */
export interface LessonTheme {
  /** Classes for the icon tile (background + icon color). */
  tile: string
  /** Border color applied on card hover. */
  hoverBorder: string
  /** Classes for the topic chip. */
  chip: string
}

const THEMES: Record<string, LessonTheme> = {
  'projectile-2d': {
    tile: 'bg-indigo-100 text-indigo-600',
    hoverBorder: 'hover:border-indigo-300',
    chip: 'bg-indigo-50 text-indigo-700',
  },
  'kinematics-1d': {
    tile: 'bg-sky-100 text-sky-600',
    hoverBorder: 'hover:border-sky-300',
    chip: 'bg-sky-50 text-sky-700',
  },
  'newtons-second-law': {
    tile: 'bg-violet-100 text-violet-600',
    hoverBorder: 'hover:border-violet-300',
    chip: 'bg-violet-50 text-violet-700',
  },
  'inclined-planes': {
    tile: 'bg-amber-100 text-amber-600',
    hoverBorder: 'hover:border-amber-300',
    chip: 'bg-amber-50 text-amber-700',
  },
  'uniform-circular-motion': {
    tile: 'bg-teal-100 text-teal-600',
    hoverBorder: 'hover:border-teal-300',
    chip: 'bg-teal-50 text-teal-700',
  },
}

const FALLBACK: LessonTheme = {
  tile: 'bg-slate-100 text-slate-600',
  hoverBorder: 'hover:border-slate-300',
  chip: 'bg-slate-100 text-slate-600',
}

/**
 * Returns the accent theme for a lesson, falling back to a neutral slate theme.
 * @param uid Lesson identifier.
 */
export function getLessonTheme(uid: string): LessonTheme {
  return THEMES[uid] ?? FALLBACK
}
