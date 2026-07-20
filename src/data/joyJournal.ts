import type { JoySignature } from '../components/SmileCamera/createJoySignature'

export type JoyVoyage = {
  completedAt: string
  colorTrail: string[]
  shape: JoySignature['shape']
  worldNames: string[]
}

const storageKey = 'joyd-voyages'
const maxStoredVoyages = 30

// The journal is a local keepsake only: it lives in this browser's
// localStorage and is never sent anywhere.
export function readVoyages(): JoyVoyage[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (voyage): voyage is JoyVoyage =>
        Boolean(voyage) &&
        typeof voyage === 'object' &&
        Array.isArray((voyage as JoyVoyage).worldNames),
    )
  } catch {
    return []
  }
}

export function saveVoyage(signature: JoySignature, worldNames: string[]) {
  try {
    const voyages = readVoyages()
    const key = worldNames.join('→')
    if (voyages.some((voyage) => voyage.worldNames.join('→') === key)) return
    voyages.push({
      completedAt: new Date().toISOString(),
      colorTrail: signature.colorTrail,
      shape: signature.shape,
      worldNames,
    })
    localStorage.setItem(storageKey, JSON.stringify(voyages.slice(-maxStoredVoyages)))
  } catch {
    // A full or unavailable localStorage should never break the journey.
  }
}
