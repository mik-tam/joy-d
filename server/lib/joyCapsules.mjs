import OpenAI from 'openai'
import { parseCapsuleOutput } from '../capsuleParser.mjs'

// This module contains no Express-specific code (no req/res). It is imported
// by both the local dev/production Express server (server/index.mjs) and the
// Vercel serverless function (api/joy-capsules.js), so the two runtimes never
// drift apart in behavior.

function isSafeSignature(value) {
  const stringFields = ['wonderTitle', 'shape']
  if (!value || typeof value !== 'object') return false
  if (!stringFields.every((field) => typeof value[field] === 'string' && value[field].length <= 80)) {
    return false
  }
  if (!Number.isInteger(value.signalPercent) || value.signalPercent < 0 || value.signalPercent > 100) {
    return false
  }
  return Array.isArray(value.colorTrail) && value.colorTrail.length === 3 && value.colorTrail.every(
    (color) => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color),
  )
}

function areSafeWorldNames(value) {
  return Array.isArray(value) && value.length <= 2 && value.every(
    (name) => typeof name === 'string' && name.length > 0 && name.length <= 120,
  )
}

function isCapsule(value) {
  const fields = ['worldName', 'visualDirection', 'story', 'quote', 'soundMood', 'surprise']
  return value && typeof value === 'object' && fields.every(
    (field) => typeof value[field] === 'string' && value[field].trim().length > 0 && value[field].length <= 420,
  )
}

const sceneBiomes = ['moonlit-sea', 'cloud-garden', 'star-harbor', 'sunrise-meadow', 'night-interior']
const sceneSprites = ['lantern-boat', 'crescent-moon', 'garden-door', 'cloud', 'wave', 'star']
const sceneSizes = ['tiny', 'small', 'grand', 'colossal']
const sceneMotions = ['drift', 'bob', 'spin-slow', 'float', 'still']

const spriteRadius = { tiny: 5, small: 9, grand: 16, colossal: 24 }
// Approximate half-width of each size in stage percentage units: the bigger a
// sprite, the further its center must stay from the edges so it never crops
// into illegibility (colossal pieces are pulled toward center stage).
const spriteFootprint = { tiny: 5, small: 9, grand: 17, colossal: 29 }

function clampSceneElement(element) {
  const halfWidth = spriteFootprint[element.size]
  const halfHeight = halfWidth * 0.7
  element.x = Math.min(99 - halfWidth, Math.max(halfWidth + 1, element.x))
  element.y = Math.min(90 - halfHeight, Math.max(10 + halfHeight, element.y))
}

// Elements may overlap a little for depth, but never swallow one another:
// iteratively push apart any pair sitting closer than most of their combined
// footprint, then keep everything inside the visible stage.
function spreadSceneElements(elements) {
  const placed = elements.map((element) => ({ ...element }))
  for (let pass = 0; pass < 24; pass += 1) {
    let moved = false
    for (let a = 0; a < placed.length; a += 1) {
      for (let b = a + 1; b < placed.length; b += 1) {
        const minDistance = (spriteRadius[placed[a].size] + spriteRadius[placed[b].size]) * 0.62
        let dx = placed[b].x - placed[a].x
        let dy = placed[b].y - placed[a].y
        let distance = Math.hypot(dx, dy)
        if (distance >= minDistance) continue
        if (distance < 0.001) {
          dx = 1
          dy = 0.5
          distance = Math.hypot(dx, dy)
        }
        const push = (minDistance - distance) / 2
        placed[a].x -= (dx / distance) * push
        placed[a].y -= (dy / distance) * push
        placed[b].x += (dx / distance) * push
        placed[b].y += (dy / distance) * push
        moved = true
      }
    }
    for (const element of placed) {
      clampSceneElement(element)
    }
    if (!moved) break
  }
  for (const element of placed) {
    element.x = Math.round(element.x)
    element.y = Math.round(element.y)
  }
  return placed
}

// A malformed scene never fails the capsule: the client composes a
// deterministic fallback scene instead.
function sanitizeScene(value) {
  if (!value || typeof value !== 'object') return undefined
  if (!sceneBiomes.includes(value.biome)) return undefined
  if (typeof value.backdrop !== 'string' || !value.backdrop.trim() || value.backdrop.length > 300) {
    return undefined
  }
  if (!Array.isArray(value.elements) || value.elements.length < 3 || value.elements.length > 6) {
    return undefined
  }
  const elements = []
  for (const element of value.elements) {
    if (!element || typeof element !== 'object') return undefined
    if (!sceneSprites.includes(element.sprite)) return undefined
    if (!sceneSizes.includes(element.size)) return undefined
    if (!sceneMotions.includes(element.motion)) return undefined
    if (typeof element.x !== 'number' || element.x < 0 || element.x > 100) return undefined
    if (typeof element.y !== 'number' || element.y < 0 || element.y > 100) return undefined
    if (typeof element.flip !== 'boolean') return undefined
    if (typeof element.description !== 'string' || !element.description.trim() || element.description.length > 300) {
      return undefined
    }
    elements.push({
      description: element.description.trim(),
      sprite: element.sprite,
      size: element.size,
      motion: element.motion,
      x: Math.round(element.x),
      y: Math.round(element.y),
      flip: element.flip,
    })
  }
  return { backdrop: value.backdrop.trim(), biome: value.biome, elements: spreadSceneElements(elements) }
}

const capsuleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['worldName', 'visualDirection', 'story', 'quote', 'soundMood', 'surprise', 'scene'],
  properties: {
    worldName: { type: 'string' },
    visualDirection: { type: 'string' },
    story: { type: 'string' },
    quote: { type: 'string' },
    soundMood: { type: 'string' },
    surprise: { type: 'string' },
    scene: {
      type: 'object',
      additionalProperties: false,
      required: ['biome', 'backdrop', 'elements'],
      properties: {
        biome: { type: 'string', enum: sceneBiomes },
        backdrop: { type: 'string' },
        elements: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['description', 'sprite', 'size', 'x', 'y', 'flip', 'motion'],
            properties: {
              description: { type: 'string' },
              sprite: { type: 'string', enum: sceneSprites },
              size: { type: 'string', enum: sceneSizes },
              x: { type: 'number' },
              y: { type: 'number' },
              flip: { type: 'boolean' },
              motion: { type: 'string', enum: sceneMotions },
            },
          },
        },
      },
    },
  },
}

const depthBriefs = [
  'This is the first door: a gentle, welcoming wonder. One or two things are quietly impossible.',
  'This is the second door, stranger and deeper: scale starts to break. Something enormous drifts where it cannot be, something tiny holds something huge.',
  'This is the third door, deeper than most travelers ever go: fully impossible. Invert sky and sea, let the colossal and the tiny trade places, put the door itself somewhere doors never stand.',
]

// Returns { status, body } — never throws — so both the Express route and the
// Vercel function can respond identically with `response.status(status).json(body)`.
export async function handleJoyCapsuleRequest(requestBody) {
  const { signature, previousWorldNames = [] } = requestBody ?? {}
  if (!isSafeSignature(signature) || !areSafeWorldNames(previousWorldNames)) {
    return { status: 400, body: { code: 'INVALID_SIGNATURE' } }
  }

  // JOYD_TEXT_PROVIDER=openai|openrouter pins the story provider; by default
  // OpenRouter wins when its key exists.
  const pinnedTextProvider = process.env.JOYD_TEXT_PROVIDER
  const useOpenRouter = pinnedTextProvider === 'openai'
    ? false
    : pinnedTextProvider === 'openrouter' || Boolean(process.env.OPENROUTER_API_KEY)
  if (useOpenRouter ? !process.env.OPENROUTER_API_KEY : !process.env.OPENAI_API_KEY) {
    return { status: 503, body: { code: 'AI_NOT_CONFIGURED' } }
  }

  try {
    const systemPrompt = [
      'You create one whimsical JOY:D joy capsule. Treat the supplied signature as a creative style cue, never a measure of identity, emotion, or psychology.',
      'Write with warm oddity: a little Ghibli warmth, curious storybook details, and surprising but gentle imagery. No copyrighted characters, no brands, no claims about the person.',
      'You also cast the visible scene. Every element gets a `description`: a vivid 8-20 word visual description of that exact thing as it appears in THIS story, weaving in the palette from visualDirection (for example: "a miniature wooden boat with one glowing amber lantern sailing a river of lavender mist"). The scene `backdrop` is one sentence describing the distant scenery of this world. Also pick each element\'s closest stand-in `sprite` from the kit: lantern-boat, crescent-moon, garden-door, cloud, wave, star. Sizes: tiny, small, grand, colossal. Motions: drift, bob, spin-slow, float, still. Positions are percentages (x 0-100 left-to-right, y 0-100 top-to-bottom).',
      'Cast 3 to 6 elements and compose them like a picture-book dream: put familiar things at impossible scales in impossible places — a colossal moon resting low, a boat sailing high among clouds, waves rolling across the top of the sky, a tiny door far from any wall, small travelers stepping off clouds. The story, the descriptions, and the scene must clearly belong to the same world.',
      'Spread the elements across the whole frame like a well-composed picture book spread: two elements may overlap slightly to create depth, but every element must remain clearly visible on its own.',
      'Return only the requested JSON.',
    ].join(' ')
    const depthBrief = depthBriefs[Math.min(previousWorldNames.length, depthBriefs.length - 1)]
    const previousWorldInstruction = previousWorldNames.length
      ? ` It must feel distinctly new and must not reuse these earlier world names: ${JSON.stringify(previousWorldNames)}.`
      : ''
    const userPrompt = `Create one fresh joy capsule using this creative signature: ${JSON.stringify(signature)}. ${depthBrief}${previousWorldInstruction}`
    const client = new OpenAI(
      useOpenRouter
        ? {
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
              'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
              'X-OpenRouter-Title': 'JOY:D',
            },
          }
        : { apiKey: process.env.OPENAI_API_KEY },
    )
    const requestCompletion = async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 45_000)
      try {
        return useOpenRouter
          ? await client.chat.completions.create({
              model: process.env.OPENROUTER_MODEL || 'openrouter/free',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'joy_capsule',
                  strict: true,
                  schema: capsuleSchema,
                },
              },
            }, { signal: controller.signal })
          : await client.responses.create({
              model: process.env.OPENAI_MODEL || 'gpt-5.6',
              store: false,
              input: [
                { role: 'developer', content: [{ type: 'input_text', text: systemPrompt }] },
                { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
              ],
              text: {
                format: {
                  type: 'json_schema',
                  name: 'joy_capsule',
                  strict: true,
                  schema: capsuleSchema,
                },
              },
            }, { signal: controller.signal })
      } finally {
        clearTimeout(timeout)
      }
    }

    // One quiet retry smooths over slow or congested models (especially the
    // free tier); auth, quota, and validation errors fail immediately.
    let completion
    try {
      completion = await requestCompletion()
    } catch (error) {
      const status = typeof error?.status === 'number' ? error.status : undefined
      const retryable = error?.name === 'AbortError' || status === undefined || status >= 500 || status === 429
      if (!retryable) throw error
      completion = await requestCompletion()
    }

    const outputText = useOpenRouter
      ? completion.choices[0]?.message.content
      : completion.output_text
    let capsule
    try {
      capsule = parseCapsuleOutput(outputText)
    } catch {
      return { status: 502, body: { code: 'INVALID_CAPSULE' } }
    }
    if (!isCapsule(capsule)) {
      return { status: 502, body: { code: 'INVALID_CAPSULE' } }
    }

    const scene = sanitizeScene(capsule.scene)
    return {
      status: 200,
      body: {
        worldName: capsule.worldName,
        visualDirection: capsule.visualDirection,
        story: capsule.story,
        quote: capsule.quote,
        soundMood: capsule.soundMood,
        surprise: capsule.surprise,
        ...(scene ? { scene } : {}),
      },
    }
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : undefined
    const code =
      error?.name === 'AbortError'
        ? 'AI_TIMEOUT'
        : error?.code === 'insufficient_quota'
          ? 'AI_QUOTA_EXHAUSTED'
        : status === 401 || status === 403
          ? 'AI_AUTH_FAILED'
          : status === 429
            ? 'AI_RATE_LIMITED'
            : status === 404
              ? 'AI_MODEL_UNAVAILABLE'
              : 'AI_UNAVAILABLE'

    console.error('JOY:D capsule request failed', {
      code: error?.code,
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error?.name,
      status,
      type: error?.type,
    })

    return { status: status && status >= 400 && status < 600 ? status : 502, body: { code } }
  }
}
