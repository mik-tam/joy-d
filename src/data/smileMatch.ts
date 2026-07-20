import type { JoySignature } from '../components/SmileCamera/createJoySignature'

export type SmileMatch = {
  matchColorTrail: string[]
  matchSource: 'demo' | 'live'
  sharedShape: JoySignature['shape']
  similarity: number
}

export class SmileMatchError extends Error {}

const clientSessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `joy-${Date.now()}-${Math.random().toString(36).slice(2)}`

export async function findSmileMatch(signature: JoySignature): Promise<SmileMatch> {
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
      }),
    })
  } catch {
    throw new SmileMatchError('The local matching constellation is unavailable.')
  }

  if (!response.ok) {
    throw new SmileMatchError('The local matching constellation is unavailable.')
  }

  const match = await response.json() as Partial<SmileMatch>
  if (
    (match.matchSource !== 'demo' && match.matchSource !== 'live') ||
    (match.sharedShape !== 'Gentle Bloom' && match.sharedShape !== 'Bright Spark' && match.sharedShape !== 'Slow Sunrise') ||
    !Number.isInteger(match.similarity)
  ) {
    throw new SmileMatchError('The local matching constellation returned an incomplete signal.')
  }
  if (!Array.isArray(match.matchColorTrail) || !match.matchColorTrail.every((color) => typeof color === 'string')) {
    match.matchColorTrail = []
  }

  return match as SmileMatch
}
