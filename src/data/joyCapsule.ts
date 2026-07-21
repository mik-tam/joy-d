import type { JoySignature } from '../components/SmileCamera/createJoySignature'

export type WorldSceneBiome =
  | 'moonlit-sea'
  | 'cloud-garden'
  | 'star-harbor'
  | 'sunrise-meadow'
  | 'night-interior'

export type WorldSceneSprite =
  | 'lantern-boat'
  | 'crescent-moon'
  | 'garden-door'
  | 'cloud'
  | 'wave'
  | 'star'

export type WorldSceneElement = {
  description: string
  sprite: WorldSceneSprite
  size: 'tiny' | 'small' | 'grand' | 'colossal'
  x: number
  y: number
  flip: boolean
  motion: 'drift' | 'bob' | 'spin-slow' | 'float' | 'still'
}

export type WorldScene = {
  backdrop?: string
  biome: WorldSceneBiome
  elements: WorldSceneElement[]
}

export type JoyCapsule = {
  quote: string
  scene?: WorldScene
  soundMood: string
  story: string
  surprise: string
  visualDirection: string
  worldName: string
}

export type JoyCapsuleErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_QUOTA_EXHAUSTED'
  | 'AI_AUTH_FAILED'
  | 'AI_RATE_LIMITED'
  | 'AI_MODEL_UNAVAILABLE'
  | 'CAPSULE_SERVICE_UNAVAILABLE'
  | 'INVALID_CAPSULE'
  | 'INVALID_SIGNATURE'

export class JoyCapsuleError extends Error {
  code: JoyCapsuleErrorCode | 'UNKNOWN'

  constructor(code: JoyCapsuleErrorCode | 'UNKNOWN') {
    super(code)
    this.code = code
  }
}

export async function generateJoyCapsule(
  signature: JoySignature,
  previousWorldNames: string[] = [],
  unlockPulse = signature.signalPercent,
  previousSprites: string[] = [],
): Promise<JoyCapsule> {
  let response: Response

  try {
    response = await fetch('/api/joy-capsules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signature: {
          colorTrail: signature.colorTrail,
          creativeSeed: signature.creativeSeed,
          shape: signature.shape,
          signalPercent: signature.signalPercent,
          unlockPulse: Math.round(Math.min(Math.max(unlockPulse, 0), 100)),
          wonderTitle: signature.wonderTitle,
        },
        previousWorldNames,
        previousSprites,
      }),
    })
  } catch {
    throw new JoyCapsuleError('CAPSULE_SERVICE_UNAVAILABLE')
  }

  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null)
    const candidateCode =
      result && typeof result === 'object' && 'code' in result && typeof result.code === 'string'
        ? result.code
        : undefined
    const code: JoyCapsuleErrorCode | undefined =
      candidateCode === 'AI_NOT_CONFIGURED' ||
      candidateCode === 'AI_TIMEOUT' ||
      candidateCode === 'AI_UNAVAILABLE' ||
      candidateCode === 'AI_QUOTA_EXHAUSTED' ||
      candidateCode === 'AI_AUTH_FAILED' ||
      candidateCode === 'AI_RATE_LIMITED' ||
      candidateCode === 'AI_MODEL_UNAVAILABLE' ||
      candidateCode === 'INVALID_CAPSULE' ||
      candidateCode === 'INVALID_SIGNATURE' ||
      candidateCode === 'CAPSULE_SERVICE_UNAVAILABLE'
        ? candidateCode
        : undefined

    if (!code && response.status >= 500) {
      throw new JoyCapsuleError('CAPSULE_SERVICE_UNAVAILABLE')
    }
    throw new JoyCapsuleError(code ?? 'UNKNOWN')
  }

  return response.json() as Promise<JoyCapsule>
}
