import type { JoySignature } from '../components/SmileCamera/createJoySignature'

export type SmileMatch = {
  matchColorTrail?: string[]
  matchSource: 'live' | 'waiting'
  matchWorlds?: Array<{
    quote: string
    worldName: string
  }>
  sharedShape?: JoySignature['shape']
  similarity?: number
}

export class SmileMatchError extends Error {}

const clientSessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `joy-${Date.now()}-${Math.random().toString(36).slice(2)}`

export async function findSmileMatch(
  signature: JoySignature,
  worlds: Array<{ quote: string; worldName: string }>,
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
          shape: signature.shape,
          signalPercent: signature.signalPercent,
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
    (world): world is { quote: string; worldName: string } =>
      Boolean(world)
      && typeof world === 'object'
      && typeof world.worldName === 'string'
      && typeof world.quote === 'string',
  )

  return match as SmileMatch
}
