import type { JoySignature } from '../components/SmileCamera/createJoySignature'

const matchShapes: JoySignature['shape'][] = ['Gentle Bloom', 'Bright Spark', 'Slow Sunrise']

export type MatchWorldSummary = {
  quote: string
  sprite?: string
  worldName: string
}

export type SmileMatch = {
  matchColorTrail?: string[]
  matchSignature?: {
    colorTrail: [string, string, string]
    heldForMs: number
    momentCode: string
    riseRate: number
    shape: JoySignature['shape']
    signalPercent: number
    wonderTitle: string
  }
  matchSource: 'live' | 'waiting'
  matchWorlds?: MatchWorldSummary[]
  sharedShape?: JoySignature['shape']
  similarity?: number
}

export class SmileMatchError extends Error {}

const clientSessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `joy-${Date.now()}-${Math.random().toString(36).slice(2)}`

export async function findSmileMatch(
  signature: JoySignature,
  worlds: MatchWorldSummary[],
): Promise<SmileMatch> {
  let response: Response

  try {
    response = await fetch('/api/smile-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSessionId,
        signature: {
          colorTrail: signature.colorTrail,
          heldForMs: signature.heldForMs,
          momentCode: signature.momentCode,
          riseRate: signature.riseRate,
          shape: signature.shape,
          signalPercent: signature.signalPercent,
          wonderTitle: signature.wonderTitle,
        },
        worlds,
      }),
    })
  } catch {
    throw new SmileMatchError('The local matching constellation is unavailable.')
  }

  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null)
    const code =
      result && typeof result === 'object' && 'code' in result && typeof result.code === 'string'
        ? result.code
        : undefined
    if (code === 'MATCHING_NOT_CONFIGURED') {
      throw new SmileMatchError('Anonymous matching needs Supabase configured on the server.')
    }
    throw new SmileMatchError('The matching constellation is unavailable.')
  }

  const match = await response.json() as Partial<SmileMatch>
  if (match.matchSource !== 'live' && match.matchSource !== 'waiting') {
    throw new SmileMatchError('The local matching constellation returned an incomplete signal.')
  }
  if (match.matchSource === 'waiting') return { matchSource: 'waiting' }
  if (
    (match.sharedShape !== 'Gentle Bloom' && match.sharedShape !== 'Bright Spark' && match.sharedShape !== 'Slow Sunrise') ||
    !Number.isInteger(match.similarity) ||
    !Array.isArray(match.matchWorlds)
  ) throw new SmileMatchError('The matching constellation returned an incomplete profile.')
  if (!Array.isArray(match.matchColorTrail) || !match.matchColorTrail.every((color) => typeof color === 'string')) {
    match.matchColorTrail = []
  }
  match.matchWorlds = match.matchWorlds.filter(
    (world): world is MatchWorldSummary =>
      Boolean(world)
      && typeof world === 'object'
      && typeof world.worldName === 'string'
      && typeof world.quote === 'string',
  )

  if (match.matchSignature && typeof match.matchSignature === 'object') {
    const detail = match.matchSignature
    if (
      !matchShapes.includes(detail.shape)
      || !Number.isInteger(detail.signalPercent)
      || !Number.isInteger(detail.heldForMs)
      || typeof detail.riseRate !== 'number'
      || typeof detail.momentCode !== 'string'
      || typeof detail.wonderTitle !== 'string'
      || !Array.isArray(detail.colorTrail)
      || detail.colorTrail.length < 3
    ) {
      match.matchSignature = undefined
    } else {
      match.matchSignature = {
        colorTrail: detail.colorTrail.slice(0, 3) as [string, string, string],
        heldForMs: detail.heldForMs,
        momentCode: detail.momentCode,
        riseRate: detail.riseRate,
        shape: detail.shape,
        signalPercent: detail.signalPercent,
        wonderTitle: detail.wonderTitle,
      }
    }
  }

  return match as SmileMatch
}
