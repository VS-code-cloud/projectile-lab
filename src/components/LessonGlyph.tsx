import type { ReactElement } from 'react'

const PATHS: Record<string, ReactElement> = {
  'projectile-2d': (
    <>
      <path d="M3 19 C 8 5, 16 5, 21 19" />
      <circle cx="3" cy="19" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8.1" r="2.1" fill="currentColor" stroke="none" />
    </>
  ),
  'kinematics-1d': (
    <>
      <path d="M3 12 H 19" />
      <path d="M15 8 L 20 12 L 15 16" />
      <circle cx="3" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  'newtons-second-law': (
    <>
      <rect x="4" y="9" width="7" height="7" rx="1.2" />
      <path d="M12 12.5 H 20" />
      <path d="M17 9.8 L 20.5 12.5 L 17 15.2" />
    </>
  ),
  'inclined-planes': (
    <>
      <path d="M3 19 H 21 L 3 7 Z" />
      <rect
        x="8.5"
        y="9"
        width="4.5"
        height="4.5"
        rx="0.8"
        transform="rotate(-34 10.75 11.25)"
      />
    </>
  ),
  'uniform-circular-motion': (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
}

const FALLBACK_PATH: ReactElement = (
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4 v16 M4 12 h16" />
  </>
)

/** Props for {@link LessonGlyph}. */
interface LessonGlyphProps {
  /** Lesson identifier selecting the glyph. */
  uid: string
  /** Icon size in px. Defaults to 22. */
  size?: number
}

/**
 * A small line-art glyph representing a lesson's physics concept.
 * @param props.uid Lesson identifier.
 * @param props.size Icon size in px.
 */
export function LessonGlyph({ uid, size = 22 }: LessonGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[uid] ?? FALLBACK_PATH}
    </svg>
  )
}
