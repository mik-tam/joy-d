import type { JoyCapsule } from './joyCapsule'
import { resolveScene } from './joyScene'

export type WorldSceneImages = {
  backdrop: string | null
  elements: (string | null)[]
}

// One generation per world per session: navigating between discovery dots
// reuses what was already painted.
const imageCache = new Map<string, Promise<WorldSceneImages | null>>()

export function generateSceneImages(capsule: JoyCapsule): Promise<WorldSceneImages | null> {
  const cached = imageCache.get(capsule.worldName)
  if (cached) return cached

  const scene = resolveScene(capsule)
  const request = (async (): Promise<WorldSceneImages | null> => {
    try {
      const response = await fetch('/api/joy-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldName: capsule.worldName,
          look: capsule.visualDirection,
          backdrop: scene.backdrop,
          elements: scene.elements.map((element) => element.description),
        }),
      })
      if (!response.ok) return null
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object' || !Array.isArray((result as WorldSceneImages).elements)) {
        return null
      }
      const parsed = result as { backdrop?: unknown; elements: unknown[] }
      return {
        backdrop: typeof parsed.backdrop === 'string' ? parsed.backdrop : null,
        elements: scene.elements.map((_, index) =>
          typeof parsed.elements[index] === 'string' ? (parsed.elements[index] as string) : null,
        ),
      }
    } catch {
      return null
    }
  })()

  imageCache.set(capsule.worldName, request)
  return request
}
