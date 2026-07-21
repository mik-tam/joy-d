import type { JoySignature } from './SmileCamera/createJoySignature'

type JoyPrintProps = {
  signature: JoySignature
  className?: string
}

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function wobblyRing(radius: number, amplitude: number, frequency: number, phase: number) {
  const steps = 52
  const points: string[] = []
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2
    const r = radius + Math.sin(angle * frequency + phase) * amplitude
    const x = 50 + Math.cos(angle) * r
    const y = 50 + Math.sin(angle) * r
    points.push(`${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return `${points.join(' ')} Z`
}

// A Joy Signature Print: fingerprint-like concentric rings generated from the
// smile's own numbers — every smile draws a slightly different print.
export function JoyPrint({ signature, className }: JoyPrintProps) {
  let seed = signature.signalPercent * 7919 + signature.heldForMs
  for (const character of signature.momentCode) seed = (seed * 31 + character.charCodeAt(0)) >>> 0
  const random = mulberry32(seed)

  const rings = Array.from({ length: 6 }, (_, index) => ({
    path: wobblyRing(
      9 + index * 6.6,
      0.9 + random() * 2.4,
      3 + Math.floor(random() * 4),
      random() * Math.PI * 2,
    ),
    color: signature.colorTrail[index % signature.colorTrail.length],
    opacity: 0.95 - index * 0.09,
    dash: index % 2 === 1 ? `${18 + random() * 26} ${5 + random() * 9}` : undefined,
    rotation: random() * 360,
  }))

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`Joy signature print ${signature.momentCode}`}>
      {rings.map((ring, index) => (
        <path
          key={index}
          d={ring.path}
          fill="none"
          stroke={ring.color}
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeDasharray={ring.dash}
          opacity={ring.opacity}
          transform={`rotate(${ring.rotation.toFixed(1)} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="2.6" fill={signature.colorTrail[0]} />
    </svg>
  )
}
