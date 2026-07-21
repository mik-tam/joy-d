import type { SmileMoment } from './useSmileDetection'

export type JoySignature = {
  colorTrail: [string, string, string]
  creativeSeed: number
  heldForMs: number
  momentCode: string
  riseRate: number
  shape: 'Gentle Bloom' | 'Bright Spark' | 'Slow Sunrise'
  signalPercent: number
  wonderTitle: string
}

const wonderTitles = [
  'Curious Door-Opener',
  'Little Light Finder',
  'Pocket Rainbow Maker',
  'Wonder Window Keeper',
  'Gentle Spark Starter',
  'Cloud Garden Explorer',
]

const colorTrails: Array<[string, string, string]> = [
  ['#f7b7d7', '#a9dfff', '#fff0a8'],
  ['#c8a7ff', '#ffc9a9', '#9ee8cf'],
  ['#fbd27f', '#f5a9d0', '#a8d8ff'],
  ['#92ead5', '#c7adff', '#ffc0bc'],
]

function smallHash(value: string) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function createJoySignature(moment: SmileMoment): JoySignature {
  const signalPercent = Math.round(moment.peakSignal * 100)
  const heldBucket = Math.round(moment.heldForMs / 50)
  const riseBucket = Math.round(moment.riseRate * 10)
  const hash = smallHash(`${signalPercent}:${heldBucket}:${riseBucket}`)

  const shape =
    moment.heldForMs >= 800
      ? 'Slow Sunrise'
      : moment.riseRate >= 0.35
        ? 'Bright Spark'
        : 'Gentle Bloom'

  return {
    colorTrail: colorTrails[hash % colorTrails.length],
    // A locally derived creative seed—not a face measurement or identifier.
    // It lets the same playful signature choose a consistent starting
    // aesthetic, while each later live-smile unlock can vary the next world.
    creativeSeed: hash,
    heldForMs: Math.round(moment.heldForMs),
    momentCode: `JOY-${hash.toString(36).slice(-5).toUpperCase()}`,
    riseRate: Math.round(moment.riseRate * 100) / 100,
    shape,
    signalPercent,
    wonderTitle: wonderTitles[(hash >>> 3) % wonderTitles.length],
  }
}
