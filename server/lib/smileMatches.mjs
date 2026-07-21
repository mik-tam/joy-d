// No Express-specific code here — shared by server/index.mjs (local dev and
// the Express production host) and api/smile-matches.js (Vercel).
//
// PERSISTENCE NOTE: `liveTravelers` is process memory. On the Express host
// (server/index.mjs) that's one long-lived process, so it behaves as
// documented: a real, ephemeral, in-memory pool shared across requests.
// On Vercel, each serverless function instance has its own memory and can be
// recycled between requests at any time, so this pool is only best-effort —
// it may or may not be shared between two nearby requests. It never breaks
// anything: `matchTraveler` already falls back to the seeded demo travelers
// whenever the live pool is empty, which is the same disclosed fallback UX
// either way. If you want real cross-instance matching on Vercel, swap this
// module's storage for a shared store (e.g. Vercel KV / Upstash Redis) behind
// the same three functions below — nothing else in the app needs to change.

const matchShapes = ['Gentle Bloom', 'Bright Spark', 'Slow Sunrise']
const liveTravelerTtlMs = 30 * 60 * 1000
const seededTravelers = [
  { id: 'seed-gentle', shape: 'Gentle Bloom', signalPercent: 72, colorTrail: ['#f7b7d7', '#a9dfff', '#fff0a8'], source: 'demo' },
  { id: 'seed-bright', shape: 'Bright Spark', signalPercent: 88, colorTrail: ['#fbd27f', '#f5a9d0', '#a8d8ff'], source: 'demo' },
  { id: 'seed-sunrise', shape: 'Slow Sunrise', signalPercent: 64, colorTrail: ['#c8a7ff', '#ffc9a9', '#9ee8cf'], source: 'demo' },
]
let liveTravelers = []

function isSafeMatchRequest(value) {
  if (!value || typeof value !== 'object') return false
  if (typeof value.clientSessionId !== 'string' || !/^[a-zA-Z0-9-]{12,80}$/.test(value.clientSessionId)) {
    return false
  }
  const { signature } = value
  return signature && typeof signature === 'object'
    && matchShapes.includes(signature.shape)
    && Number.isInteger(signature.signalPercent)
    && signature.signalPercent >= 0
    && signature.signalPercent <= 100
    && Array.isArray(signature.colorTrail)
    && signature.colorTrail.length === 3
    && signature.colorTrail.every((color) => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color))
}

function matchScore(first, second) {
  const shapeScore = first.shape === second.shape ? 1 : 0
  const signalScore = 1 - Math.min(Math.abs(first.signalPercent - second.signalPercent), 100) / 100
  const sharedColors = first.colorTrail.filter((color) => second.colorTrail.includes(color)).length / 3
  return shapeScore * 0.55 + signalScore * 0.35 + sharedColors * 0.1
}

function removeExpiredLiveTravelers(now) {
  liveTravelers = liveTravelers.filter((traveler) => now - traveler.createdAt < liveTravelerTtlMs)
}

export function handleSmileMatchRequest(requestBody) {
  if (!isSafeMatchRequest(requestBody)) {
    return { status: 400, body: { code: 'INVALID_MATCH_SIGNATURE' } }
  }

  const { clientSessionId, signature } = requestBody
  const now = Date.now()
  removeExpiredLiveTravelers(now)

  const currentTraveler = {
    id: clientSessionId,
    shape: signature.shape,
    signalPercent: signature.signalPercent,
    colorTrail: signature.colorTrail,
    source: 'live',
    createdAt: now,
  }
  const otherLiveTravelers = liveTravelers.filter((traveler) => traveler.id !== clientSessionId)
  const candidates = otherLiveTravelers.length ? otherLiveTravelers : seededTravelers
  const match = candidates.reduce((closest, traveler) => (
    matchScore(currentTraveler, traveler) > matchScore(currentTraveler, closest) ? traveler : closest
  ))

  liveTravelers = [
    ...liveTravelers.filter((traveler) => traveler.id !== clientSessionId),
    currentTraveler,
  ].slice(-24)

  return {
    status: 200,
    body: {
      matchSource: match.source,
      matchColorTrail: match.colorTrail,
      sharedShape: match.shape,
      similarity: Math.round(72 + matchScore(currentTraveler, match) * 26),
    },
  }
}
