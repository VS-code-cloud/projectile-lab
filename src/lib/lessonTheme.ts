/** Visual theme (accent classes) for a lesson, keyed by lesson uid. */
export interface LessonTheme {
  /** Classes for the icon tile (background + icon color). */
  tile: string
  /** Border color applied on card hover. */
  hoverBorder: string
  /** Classes for the topic chip. */
  chip: string
  /**
   * rgba() string feeding `--halo` for the `bg-halo` focal glow on the lesson
   * player chrome. Optional so existing consumers are unaffected.
   */
  halo?: string
  /** Accent text color class for player headers (e.g. 'text-indigo-700'). */
  accentText?: string
  /** Accent border color class for player surfaces (e.g. 'border-indigo-200'). */
  accentBorder?: string
  /** Gradient class pair for the progress fill (e.g. 'from-indigo-500 to-violet-500'). */
  accentBar?: string
  /** Hex colors used for the completion confetti burst. */
  confetti?: string[]
}

const THEMES: Record<string, LessonTheme> = {
  'projectile-2d': {
    tile: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 ring-1 ring-indigo-200/70',
    hoverBorder: 'hover:border-indigo-300',
    chip: 'bg-indigo-50 text-indigo-700',
    halo: 'rgba(99, 102, 241, 0.18)',
    accentText: 'text-indigo-700',
    accentBorder: 'border-indigo-200',
    accentBar: 'from-indigo-500 to-violet-500',
    confetti: ['#6366f1', '#8b5cf6', '#a855f7'],
  },
  'kinematics-1d': {
    tile: 'bg-gradient-to-br from-sky-50 to-sky-100 text-sky-600 ring-1 ring-sky-200/70',
    hoverBorder: 'hover:border-sky-300',
    chip: 'bg-sky-50 text-sky-700',
    halo: 'rgba(14, 165, 233, 0.18)',
    accentText: 'text-sky-700',
    accentBorder: 'border-sky-200',
    accentBar: 'from-sky-500 to-cyan-500',
    confetti: ['#0ea5e9', '#06b6d4', '#38bdf8'],
  },
  'newtons-second-law': {
    tile: 'bg-gradient-to-br from-violet-50 to-violet-100 text-violet-600 ring-1 ring-violet-200/70',
    hoverBorder: 'hover:border-violet-300',
    chip: 'bg-violet-50 text-violet-700',
    halo: 'rgba(139, 92, 246, 0.18)',
    accentText: 'text-violet-700',
    accentBorder: 'border-violet-200',
    accentBar: 'from-violet-500 to-fuchsia-500',
    confetti: ['#8b5cf6', '#a855f7', '#d946ef'],
  },
  'forces-free-body': {
    tile: 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 ring-1 ring-rose-200/70',
    hoverBorder: 'hover:border-rose-300',
    chip: 'bg-rose-50 text-rose-700',
    halo: 'rgba(244, 63, 94, 0.18)',
    accentText: 'text-rose-700',
    accentBorder: 'border-rose-200',
    accentBar: 'from-rose-500 to-pink-500',
    confetti: ['#f43f5e', '#fb7185', '#ec4899'],
  },
  'inclined-planes': {
    tile: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 ring-1 ring-amber-200/70',
    hoverBorder: 'hover:border-amber-300',
    chip: 'bg-amber-50 text-amber-700',
    halo: 'rgba(245, 158, 11, 0.18)',
    accentText: 'text-amber-700',
    accentBorder: 'border-amber-200',
    accentBar: 'from-amber-500 to-orange-500',
    confetti: ['#f59e0b', '#f97316', '#fbbf24'],
  },
  'uniform-circular-motion': {
    tile: 'bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600 ring-1 ring-teal-200/70',
    hoverBorder: 'hover:border-teal-300',
    chip: 'bg-teal-50 text-teal-700',
    halo: 'rgba(20, 184, 166, 0.18)',
    accentText: 'text-teal-700',
    accentBorder: 'border-teal-200',
    accentBar: 'from-teal-500 to-emerald-500',
    confetti: ['#14b8a6', '#10b981', '#2dd4bf'],
  },
}

const FALLBACK: LessonTheme = {
  tile: 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 ring-1 ring-slate-200/70',
  hoverBorder: 'hover:border-slate-300',
  chip: 'bg-slate-100 text-slate-600',
  halo: 'rgba(100, 116, 139, 0.16)',
  accentText: 'text-slate-700',
  accentBorder: 'border-slate-200',
  accentBar: 'from-slate-500 to-slate-600',
  confetti: ['#64748b', '#94a3b8', '#475569'],
}

/**
 * Returns the accent theme for a lesson, falling back to a neutral slate theme.
 * @param uid Lesson identifier.
 */
export function getLessonTheme(uid: string): LessonTheme {
  return THEMES[uid] ?? FALLBACK
}
