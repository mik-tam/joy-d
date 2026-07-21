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
  if (!Number.isInteger(value.creativeSeed) || value.creativeSeed < 0 || value.creativeSeed > 4_294_967_295) {
    return false
  }
  if (!Number.isInteger(value.unlockPulse) || value.unlockPulse < 0 || value.unlockPulse > 100) {
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

function areSafeSprites(value) {
  return Array.isArray(value) && value.length <= 24 && value.every(
    (sprite) => typeof sprite === 'string' && sceneSprites.includes(sprite),
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

// Approximate half-width of each size in stage percentage units: the bigger a
// sprite, the further its center must stay from the edges so it never crops
// into illegibility (colossal pieces are pulled toward center stage). This is
// also the true rendered footprint (see spriteWidths in WorldStage.tsx, which
// maps to roughly these same percentages of the viewport), so it's the right
// number to use for keeping two sprites from visually swallowing each other.
const spriteFootprint = { tiny: 5, small: 9, grand: 17, colossal: 29 }

function clampSceneElement(element) {
  const halfWidth = spriteFootprint[element.size]
  const halfHeight = halfWidth * 0.7
  // Keep floating subjects out of the portal UI chrome: title/story band,
  // bottom controls, smile meter (bottom-left), and sound controls (top-right).
  // Subjects may still overlap each other slightly for depth.
  let minX = halfWidth + 1
  let maxX = 99 - halfWidth
  // Mid-stage band sits below the story card and above the CTA row. minY is
  // always >= 48, comfortably below the title/story panel above it, so that
  // alone keeps the panel clear — no need to also force x toward one of two
  // narrow side pockets (the previous approach), which fought this same
  // function's own pairwise spacing when called every iteration of the
  // solver below and reclustered multiple elements onto the same pocket.
  let minY = Math.max(48, 10 + halfHeight)
  let maxY = Math.min(66 - halfHeight * 0.15, 72 - halfHeight)
  if (element.y > 58) minX = Math.max(minX, 32)
  element.x = Math.min(maxX, Math.max(minX, element.x))
  element.y = Math.min(maxY, Math.max(minY, element.y))
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
        // Using the real footprint (not a smaller abstract "collision radius")
        // is what previously let colossal/grand pairs land almost on top of
        // each other — their true rendered half-widths summed to far more
        // than the old radius-based minimum ever enforced.
        const minDistance = (spriteFootprint[placed[a].size] + spriteFootprint[placed[b].size]) * 0.9
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

function significantTokens(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4),
  )
}

function overlapsHiddenWonder(description, surpriseTokens) {
  if (!surpriseTokens.size) return false
  const descriptionTokens = significantTokens(description)
  let shared = 0
  for (const token of descriptionTokens) {
    if (surpriseTokens.has(token)) shared += 1
  }
  return shared >= 2
}

function mentionsDoor(text) {
  return /\b(doors?|doorways?|arch(?:way|es)?|portals?|gates?|thresholds?|keyholes?|entryways?)\b/i.test(text)
}

function stripDoorLanguage(text) {
  return text
    .replace(/\b(doors?|doorways?|arch(?:way|es)?|portals?|gates?|thresholds?|keyholes?|entryways?)\b/gi, 'glow')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim()
}

// A malformed scene never fails the capsule: the client composes a
// deterministic fallback scene instead. Hidden-wonder lookalikes are
// stripped so the surprise stays invisible until a WOW face reveals it.
function sanitizeScene(value, surprise = '') {
  if (!value || typeof value !== 'object') return undefined
  if (!sceneBiomes.includes(value.biome)) return undefined
  if (typeof value.backdrop !== 'string' || !value.backdrop.trim() || value.backdrop.length > 300) {
    return undefined
  }
  if (!Array.isArray(value.elements) || value.elements.length < 3 || value.elements.length > 6) {
    return undefined
  }
  const surpriseTokens = significantTokens(typeof surprise === 'string' ? surprise : '')
  const elements = []
  let doorwayCount = 0
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
    let description = element.description.trim()
    let sprite = element.sprite
    if (overlapsHiddenWonder(description, surpriseTokens)) continue

    // At most one doorway in the whole cast. Extra door sprites are dropped;
    // door-like wording on non-door sprites is rewritten so image gen cannot
    // paint a second arch into the world.
    const doorish = sprite === 'garden-door' || mentionsDoor(description)
    if (doorish) {
      if (doorwayCount >= 1) {
        if (sprite === 'garden-door') continue
        description = stripDoorLanguage(description)
        if (!description) continue
        sprite = sprite === 'garden-door' ? 'star' : sprite
      } else {
        sprite = 'garden-door'
        doorwayCount += 1
      }
    }

    elements.push({
      description,
      sprite,
      size: element.size,
      motion: element.motion,
      x: Math.round(element.x),
      y: Math.round(element.y),
      flip: element.flip,
    })
  }
  if (elements.length < 3) return undefined

  // Backdrop stays landscape-only once a doorway is already cast (or whenever
  // it tries to invent arches of its own).
  let backdrop = value.backdrop.trim()
  if (mentionsDoor(backdrop)) backdrop = stripDoorLanguage(backdrop)

  return { backdrop, biome: value.biome, elements: spreadSceneElements(elements) }
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
  'This is the first door: an inviting but visually distinctive world. One or two things are quietly impossible.',
  'This is the second door: stranger, bolder, and unlike the first. Scale starts to break; something enormous drifts where it cannot be, and something tiny holds something huge.',
  'This is the third door: fully impossible and visually surprising. Invert sky and sea, let the colossal and tiny trade places, and put the door itself somewhere doors never stand.',
]

const lightArtProfiles = [
  'dreamy pastel watercolor — translucent washes, soft peach lavender mint and cream light, delicate painted texture, airy negative space, and a gentle impossible landscape',
  'softly painted cloud dream — pale sunrise colors, hand-painted watercolor texture, floating friendly forms, and quiet luminous wonder',
  'sunlit storybook meadow — light gold and blush tones, breezy open sky, soft edges, and a warm inviting composition',
  'porcelain-and-watercolor travel postcard — pale mineral colors, wide airy space, one impossible focal object, and a tender optimistic mood',
]

const boldArtProfiles = [
  'graphic-novel garden — bold ink contours, rich flat color fields, sunny theatrical light, and a sharp joyful poster-like composition',
  'luminous risograph collage — misregistered blocks of coral, cobalt, and moss, cut-paper shapes, visible print grain, playful but graphic',
  'psychedelic geometric dream — saturated jewel colors, looping symbolic forms, crisp graphic silhouettes, asymmetrical framing, and energetic visual rhythm',
  'folk-art tapestry — embroidered lines, dense ornament, jewel-toned textile texture, flattened perspective, and friendly ceremonial creatures',
]

const deepArtProfiles = [
  'starlit wonder atlas — deep indigo with warm gold accents, fine etched details, friendly impossible objects, and pools of kind starlight',
  'charcoal-and-pastel night theatre — soft black paper, chalky constellations, warm spotlights, oversized props, and a cozy sense of mystery',
  'deep-sea ink fable — blue-green water, phosphorescent accents, delicate crosshatching, drifting friendly forms, and calm wonder',
  'midnight paper-cut diorama — layered silhouettes, crisp shapes, electric accent colors, magical depth, and a sense of playful theater',
  'mythic natural-history plate — weathered pigment, curious friendly creatures, mossy shadow, botanical delight, and a feeling of discovery',
]

function artDirectionFor(signature, worldDepth) {
  // Door 1 favors light/dreamy tones, door 2 bolder graphic styles, door 3
  // deeper nocturnal mystery — so a full journey keeps the original pastel
  // watercolor family in the mix instead of collapsing into one dark look.
  const pools = [lightArtProfiles, boldArtProfiles, deepArtProfiles]
  const pool = pools[Math.min(worldDepth, pools.length - 1)]
  const pulseVariant = signature.unlockPulse >= 68 ? 1 : 0
  const profile = pool[(signature.creativeSeed + pulseVariant) % pool.length]
  const energy =
    signature.unlockPulse >= 82
      ? 'Make the composition high-energy, radiant, and warmly inviting.'
      : signature.unlockPulse <= 55
        ? 'Make the composition quieter and more spacious, but still warm, hopeful, and emotionally safe.'
        : 'Balance luminous detail with a calm, surprising, and kind composition.'
  return `${profile}. ${energy}`
}

// Returns { status, body } — never throws — so both the Express route and the
// Vercel function can respond identically with `response.status(status).json(body)`.
export async function handleJoyCapsuleRequest(requestBody) {
  const { signature, previousWorldNames = [], previousSprites = [] } = requestBody ?? {}
  if (!isSafeSignature(signature) || !areSafeWorldNames(previousWorldNames) || !areSafeSprites(previousSprites)) {
    return { status: 400, body: { code: 'INVALID_SIGNATURE' } }
  }

  // Default to OpenRouter whenever its key exists (hackathon credits). Pin with
  // JOYD_TEXT_PROVIDER=openai only if you intentionally want direct OpenAI.
  // Images stay independently routed in joyScenes.mjs.
  const pinnedTextProvider = process.env.JOYD_TEXT_PROVIDER?.trim().toLowerCase()
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim())
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim())
  const useOpenRouter =
    pinnedTextProvider === 'openai'
      ? false
      : pinnedTextProvider === 'openrouter'
        ? hasOpenRouter
        : hasOpenRouter || !hasOpenAI
  if (useOpenRouter ? !hasOpenRouter : !hasOpenAI) {
    return { status: 503, body: { code: 'AI_NOT_CONFIGURED' } }
  }

  // OpenAI chat models via OpenRouter frequently return provider ToS 403s even
  // when image credits work. Keep OpenRouter for stories, but avoid openai/*.
  const openRouterFreeModel = 'openrouter/free'
  const openRouterChatFallbacks = [
    'google/gemini-2.5-flash',
    'anthropic/claude-sonnet-4',
    'deepseek/deepseek-chat-v3-0324',
  ]
  // Free tier is the default (no OpenRouter credits burned for stories); it's
  // also the slowest and least consistent option, so a short timeout on it
  // specifically hands off to direct OpenAI rather than making a traveler wait.
  const resolveOpenRouterChatModels = () => {
    const requested = process.env.OPENROUTER_MODEL?.trim()
    const primary =
      !requested || requested.startsWith('openai/')
        ? openRouterFreeModel
        : requested
    if (requested?.startsWith('openai/')) {
      console.warn(
        `JOY:D skipping OpenRouter chat model "${requested}" (OpenAI chat via OpenRouter often returns ToS 403). Using ${primary}.`,
      )
    }
    return [...new Set([primary, ...openRouterChatFallbacks])]
  }

  const STANDARD_TIMEOUT_MS = 45_000
  // Free tier is consistently reachable but can take close to the old 20s
  // budget to respond. Cutting this down means most slow requests hand off
  // to paid OpenAI well before a traveler would call it "loading forever" —
  // worth the occasional redundant OpenAI call now that billing is set up.
  const FREE_TIER_TIMEOUT_MS = 10_000

  let activeOpenRouterModel = useOpenRouter ? resolveOpenRouterChatModels()[0] : undefined
  let servedByOpenAIFallback = false

  try {
    const worldDepth = previousWorldNames.length
    const artDirection = artDirectionFor(signature, worldDepth)
    const systemPrompt = [
      'You create one whimsical JOY:D joy capsule. Treat the supplied signature as a creative style cue, never a measure of identity, emotion, or psychology.',
      'Create original visual language. Never imitate a named artist, studio, franchise, character, or brand. Follow the supplied art direction exactly — including when it asks for dreamy pastel watercolor, soft light, or airy storybook tones.',
      'This is opened by a happy smile, so every world must feel emotionally safe, hopeful, and delightful even when its palette is dark or strange. Weird and adult-curious is welcome; creepy is not. Never use horror, menace, gore, death, skulls, predatory creatures, haunted or blank stares, threatening figures, sinister dolls, porcelain dolls, pale ghostly children, distorted faces, weeping faces, evil eyes, or despair. Give every unusual image a warm, curious, or playful anchor.',
      `The required art direction for this door is: ${artDirection} The returned visualDirection MUST state and preserve this direction clearly; it controls every generated image in this world.`,
      'The `surprise` is a hidden wonder: a single delightful visual OBJECT or creature, described the same way a scene element would be (a vivid 8-20 word visual description of one thing). It is never a doorway, arch, gate, portal, or keyhole, and never a person, traveler, or human figure — those break the single-object rule and would visually clash with the rest of the cast. Write it only in the `surprise` field. It must be completely absent from the visible scene. Never describe, name, depict, foreshadow, silhouette, or include it in the `scene.backdrop`, `scene.elements`, worldName, story, or quote. Do not place a second glowing doorway, secret arch, or lookalike stand-in for the hidden wonder in the visible scene; the traveler must not see it until a WOW face reveals it.',
      'You also cast the visible scene. Every element gets a `description`: a vivid 8-20 word visual description of that exact thing as it appears in THIS story, weaving in the palette and art direction from visualDirection. The scene `backdrop` is one sentence of distant scenery with NO doorway, arch, gate, or portal. Pick each element\'s closest stand-in `sprite` from the kit: lantern-boat, crescent-moon, garden-door, cloud, wave, star. These are interaction stand-ins, not a requirement to include their literal subject. HARD RULE: at most ONE doorway/arch/portal in the entire world — use `garden-door` for it if needed, and never describe doors on any other sprite or in the backdrop. Sizes: tiny, small, grand, colossal. Motions: drift, bob, spin-slow, float, still. Positions are percentages (x 0-100 left-to-right, y 0-100 top-to-bottom).',
      'Compose for readability: floating subjects must have strong value and color contrast against the backdrop so they remain easy to see. Keep subjects out of the top title band (about y 0-22), the bottom control band (about y 72-100), the bottom-left smile meter, and the top-right sound controls. Subjects may overlap each other a little for depth, but must not cover the UI and must remain individually readable.',
      'Cast 3 to 6 elements and compose an original scene with impossible scale, depth, and a clear focal point. The story, descriptions, and scene must clearly belong to the same world.',
      'Return only the requested JSON.',
    ].join(' ')
    const depthBrief = depthBriefs[Math.min(worldDepth, depthBriefs.length - 1)]
    const previousWorldInstruction = previousWorldNames.length
      ? ` It must feel distinctly new and must not reuse these earlier world names: ${JSON.stringify(previousWorldNames)}.`
      : ''
    // Without this, journeys tend to converge on the same 1-2 sprite
    // subjects (a lantern-boat and a crescent-moon) door after door, even
    // though each world's story and palette differ — the sprite enum is a
    // small, tempting default to repeat unless explicitly told not to.
    const previousSpriteInstruction = previousSprites.length
      ? ` Earlier doors in this same journey already cast these sprite stand-ins: ${JSON.stringify(previousSprites)}. Cast a genuinely different set of subjects and sprite choices this time — do not just repeat the same 1-2 sprites again with a new color.`
      : ''
    const userPrompt = `Create one fresh joy capsule using this creative signature: ${JSON.stringify(signature)}. ${depthBrief}${previousWorldInstruction}${previousSpriteInstruction}`
    const openRouterClient = useOpenRouter
      ? new OpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://joy-d-one.vercel.app',
            'X-OpenRouter-Title': 'JOY:D',
          },
        })
      : undefined
    // OpenAI is either the pinned provider, or the fallback when free-tier
    // OpenRouter is too slow — built lazily so we don't require the key
    // unless one of those two cases actually needs it.
    let openAIClient
    const getOpenAIClient = () => {
      if (!openAIClient) openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      return openAIClient
    }

    const openRouterModels = useOpenRouter ? resolveOpenRouterChatModels() : []
    activeOpenRouterModel = openRouterModels[0]

    const requestViaOpenRouter = async (model, timeoutMs) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        activeOpenRouterModel = model
        return await openRouterClient.chat.completions.create({
          model,
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
          // Gemini Flash otherwise burns the output budget on hidden
          // "thinking" tokens and can return empty structured JSON.
          reasoning: { effort: 'none' },
        }, { signal: controller.signal })
      } finally {
        clearTimeout(timeout)
      }
    }

    const requestViaOpenAI = async (timeoutMs) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        return await getOpenAIClient().responses.create({
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

    const requestOpenAIWithRetry = async () => {
      try {
        return await requestViaOpenAI(STANDARD_TIMEOUT_MS)
      } catch (error) {
        const status = typeof error?.status === 'number' ? error.status : undefined
        const retryable = error?.name === 'AbortError' || status === undefined || status >= 500 || status === 429
        if (!retryable) throw error
        return await requestViaOpenAI(STANDARD_TIMEOUT_MS)
      }
    }

    // Walk the OpenRouter model chain (free tier first, then paid
    // fallbacks): a ToS/404 block moves to the next model, a slow free-tier
    // response gives up on OpenRouter immediately (paid fallbacks are
    // account-blocked too when the account itself is blocked, so cycling
    // through them just burns time), and any other transient error gets one
    // quiet retry of that same model before moving on. If every OpenRouter
    // attempt fails, direct OpenAI is the backup whenever it's configured —
    // not only for a slow free tier — since a ToS-blocked account can also
    // block every paid fallback outright.
    let completion
    if (!useOpenRouter) {
      completion = await requestOpenAIWithRetry()
    } else {
      let lastError
      for (const model of openRouterModels) {
        const timeoutMs = model === openRouterFreeModel ? FREE_TIER_TIMEOUT_MS : STANDARD_TIMEOUT_MS
        try {
          completion = await requestViaOpenRouter(model, timeoutMs)
          lastError = undefined
          break
        } catch (error) {
          lastError = error
          const status = typeof error?.status === 'number' ? error.status : undefined
          const message = error instanceof Error ? error.message : ''
          const providerBlocked = status === 403 && /terms of service|prohibited/i.test(message)
          if (error?.name === 'AbortError' && model === openRouterFreeModel) {
            console.warn('JOY:D OpenRouter free tier timed out.')
            break
          }
          if (providerBlocked || status === 404) {
            console.warn(`JOY:D OpenRouter model "${model}" failed (${status}); trying next fallback if any.`)
            continue
          }
          const retryable = error?.name === 'AbortError' || status === undefined || status >= 500 || status === 429
          if (!retryable) break
          try {
            completion = await requestViaOpenRouter(model, timeoutMs)
            lastError = undefined
            break
          } catch (retryError) {
            lastError = retryError
            break
          }
        }
      }
      if (!completion) {
        if (!hasOpenAI) throw lastError
        console.warn('JOY:D all OpenRouter chat attempts failed; falling back to direct OpenAI for this request.')
        servedByOpenAIFallback = true
        completion = await requestOpenAIWithRetry()
      }
    }

    const outputText = useOpenRouter && !servedByOpenAIFallback
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

    const scene = sanitizeScene(capsule.scene, capsule.surprise)
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
    const message = error instanceof Error ? error.message : ''
    const providerBlocked = status === 403 && /terms of service|prohibited/i.test(message)
    const code =
      error?.name === 'AbortError'
        ? 'AI_TIMEOUT'
        : error?.code === 'insufficient_quota'
          ? 'AI_QUOTA_EXHAUSTED'
        : providerBlocked
          ? 'AI_MODEL_UNAVAILABLE'
        : status === 401
          ? 'AI_AUTH_FAILED'
          : status === 403
            ? 'AI_AUTH_FAILED'
          : status === 429
            ? 'AI_RATE_LIMITED'
            : status === 404
              ? 'AI_MODEL_UNAVAILABLE'
              : 'AI_UNAVAILABLE'

    console.error('JOY:D capsule request failed', {
      code: error?.code,
      message,
      name: error?.name,
      provider: useOpenRouter && !servedByOpenAIFallback ? 'openrouter' : 'openai',
      model: useOpenRouter && !servedByOpenAIFallback
        ? activeOpenRouterModel || process.env.OPENROUTER_MODEL || 'openrouter/free'
        : (process.env.OPENAI_MODEL || 'gpt-5.6'),
      status,
      type: error?.type,
    })

    return { status: status && status >= 400 && status < 600 ? status : 502, body: { code } }
  }
}
