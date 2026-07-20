type DoorMarkProps = {
  className?: string
}

// The JOY:D mark: a "D" laid on its back becomes both a smile and a little
// arched doorway, with the ":" as two glowing windows in the door.
export function DoorMark({ className }: DoorMarkProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="JOY:D door mark">
      <defs>
        <linearGradient id="joyd-door" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe8a8" />
          <stop offset="0.55" stopColor="#f5a9c6" />
          <stop offset="1" stopColor="#c86ee0" />
        </linearGradient>
        <radialGradient id="joyd-light" cx="0.5" cy="0.85" r="0.9">
          <stop offset="0" stopColor="#fff7d9" />
          <stop offset="0.55" stopColor="#ffd98f" />
          <stop offset="1" stopColor="#f09fb6" />
        </radialGradient>
      </defs>
      <ellipse cx="48" cy="90" rx="35" ry="4" fill="rgba(20,8,42,0.35)" />
      <path
        d="M18 88 V46 A30 30 0 0 1 78 46 V88 Z"
        fill="url(#joyd-door)"
        stroke="#3b225b"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M29 88 V49 A19 19 0 0 1 67 49 V88 Z" fill="url(#joyd-light)" />
      <path
        d="M36 74 Q48 84 60 74"
        fill="none"
        stroke="#a4487c"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="48" cy="42" r="4.5" fill="#fff7d9" stroke="#a4487c" strokeWidth="2" />
      <circle cx="48" cy="57" r="4.5" fill="#fff7d9" stroke="#a4487c" strokeWidth="2" />
    </svg>
  )
}
