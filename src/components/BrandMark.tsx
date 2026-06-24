/** Props for {@link BrandMark}. */
interface BrandMarkProps {
  /** Pixel size of the square mark. Defaults to 28. */
  size?: number
  /** Optional additional class names. */
  className?: string
}

/**
 * The app's logo mark: a projectile launching along a parabolic arc, drawn as
 * an inline SVG. A subtle, professional nod to the kinematics subject matter.
 * @param props.size Pixel size of the square mark.
 */
export function BrandMark({ size = 28, className }: BrandMarkProps) {
  const gid = `bm-grad-${size}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="ProjectileLab logo"
      className={className}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${gid})`} />
      <rect x="1" y="1" width="30" height="15" rx="9" fill="#ffffff" opacity="0.08" />
      <path
        d="M6 25 C 12 7, 20 7, 26 25"
        stroke="#e0e7ff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 3"
        fill="none"
      />
      <line x1="6" y1="25" x2="26" y2="25" stroke="#c7d2fe" strokeWidth="1.5" />
      <circle cx="6" cy="25" r="2.6" fill="#ffffff" />
      <circle cx="20.3" cy="11.6" r="3.4" fill="#ffffff" />
    </svg>
  )
}
