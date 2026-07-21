import OpenAI from 'openai'

// No Express-specific code here — shared by server/index.mjs (local dev and
// the Express production host) and api/joy-scenes.js (Vercel).

const worldImagesEnabled = (process.env.JOYD_WORLD_IMAGES ?? 'on') !== 'off'
const sceneSprites = ['lantern-boat', 'crescent-moon', 'garden-door', 'cloud', 'wave', 'star']

function normalizeElements(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) return null
  const elements = []
  for (const entry of value) {
    if (typeof entry === 'string') {
      if (!entry.length || entry.length > 320) return null
      elements.push({ description: entry, sprite: null })
      continue
    }
    if (!entry || typeof entry !== 'object') return null
    if (typeof entry.description !== 'string' || !entry.description.length || entry.description.length > 320) {
      return null
    }
    if (entry.sprite != null && !sceneSprites.includes(entry.sprite)) return null
    elements.push({ description: entry.description, sprite: entry.sprite ?? null })
  }
  return elements
}

function isSafeSceneImageRequest(value) {
  if (!value || typeof value !== 'object') return false
  if (typeof value.worldName !== 'string' || !value.worldName.length || value.worldName.length > 120) {
    return false
  }
  if (typeof value.look !== 'string' || value.look.length > 480) return false
  if (value.backdrop !== undefined && (typeof value.backdrop !== 'string' || value.backdrop.length > 320)) {
    return false
  }
  return Boolean(normalizeElements(value.elements))
}

function elementPrompt(description, sprite) {
  const base = `${description}. A single isolated object, centered, alone on a fully transparent background: transparent pixels everywhere outside the object's own silhouette, with zero painted sky, clouds, stars, gradient, or any other scenery of any kind behind it. Clear readable silhouette with strong contrast, soft outer glow optional. No ground, no cast shadow, no border. No human or humanoid figures, faces, silhouettes, or characters of any kind — depict only the described object or creature itself.`
  if (sprite === 'garden-door') {
    return `${base} This may be exactly one whimsical doorway or arch — never a cluster of doors.`
  }
  // Only the sprite explicitly cast as the world's one doorway may ever be
  // painted as a door: every other element (including the hidden wonder,
  // which has no sprite of its own) is described as a door-like shape only
  // in words sometimes, never as literal architecture in the image itself.
  return `${base} This subject is NOT a door, doorway, arch, gate, portal, or keyhole, even if its description sounds like one. Do not paint architectural openings.`
}

// Generates the world's visuals from the story itself: transparent sprites
// for each cast element plus a distant backdrop, style-locked to the
// capsule's LOOK direction. Prompts contain only AI-generated story text —
// never anything from the camera. OpenRouter takes priority when configured,
// matching the text provider; OpenAI is used directly otherwise.
export async function handleJoySceneRequest(requestBody) {
  if (!isSafeSceneImageRequest(requestBody)) {
    return { status: 400, body: { code: 'INVALID_SCENE_REQUEST' } }
  }
  // JOYD_IMAGE_PROVIDER=openai|openrouter pins the image provider; by default
  // OpenRouter wins when its key exists (credits for gpt-image-1-mini).
  const pinnedProvider = process.env.JOYD_IMAGE_PROVIDER?.trim().toLowerCase()
  const useOpenRouterImages = pinnedProvider === 'openai'
    ? false
    : pinnedProvider === 'openrouter' || Boolean(process.env.OPENROUTER_API_KEY?.trim())
  const imageKeyAvailable = useOpenRouterImages
    ? Boolean(process.env.OPENROUTER_API_KEY)
    : Boolean(process.env.OPENAI_API_KEY)
  if (!worldImagesEnabled || !imageKeyAvailable) {
    return { status: 503, body: { code: 'IMAGE_GEN_UNAVAILABLE' } }
  }

  const { look, backdrop } = requestBody
  const elements = normalizeElements(requestBody.elements)
  const imageModel = useOpenRouterImages
    ? process.env.OPENROUTER_IMAGE_MODEL || 'openai/gpt-image-1-mini'
    : process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  const imageConstraints = 'Create original artwork. Follow the supplied LOOK exactly — including dreamy pastel watercolor when LOOK asks for it. Keep the emotional tone warm, whimsical, and emotionally safe—never scary, sinister, horror-like, or threatening. Give subjects clear silhouette contrast against their surroundings so they remain easy to see on a busy backdrop. No text, no words, no lettering, no watermark, no border, and no copyrighted characters or brands.'

  const generateViaOpenRouter = async (prompt, { size, transparent }) => {
    const result = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://joy-d-one.vercel.app',
        'X-OpenRouter-Title': 'JOY:D',
      },
      body: JSON.stringify({
        model: imageModel,
        prompt,
        size,
        quality: 'low',
        output_format: 'webp',
        ...(transparent ? { background: 'transparent' } : {}),
      }),
      signal: controller.signal,
    })
    if (!result.ok) {
      const body = await result.text().catch(() => '')
      throw new Error(`OpenRouter images ${result.status}: ${body.slice(0, 200)}`)
    }
    const parsed = await result.json()
    const image = parsed.data?.[0]
    if (!image?.b64_json) return null
    return `data:${image.media_type || 'image/webp'};base64,${image.b64_json}`
  }

  const generateViaOpenAI = async (prompt, { size, transparent }) => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const result = await client.images.generate({
      model: imageModel,
      prompt,
      size,
      quality: 'low',
      output_format: 'webp',
      ...(transparent ? { background: 'transparent' } : {}),
    }, { signal: controller.signal })
    const b64 = result.data?.[0]?.b64_json
    return b64 ? `data:image/webp;base64,${b64}` : null
  }

  const generateOne = async (prompt, options) => {
    try {
      return useOpenRouterImages
        ? await generateViaOpenRouter(prompt, options)
        : await generateViaOpenAI(prompt, options)
    } catch (error) {
      console.error('JOY:D scene image failed', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: typeof error?.status === 'number' ? error.status : undefined,
      })
      return null
    }
  }

  try {
    // Cap generated sprites to keep each world fast and inexpensive. The
    // world's one permitted doorway (if any) lives only in its own cast
    // element sprite — the backdrop itself never paints one, regardless of
    // whether a doorway element exists elsewhere, to avoid ever doubling up.
    const cappedElements = elements.slice(0, 4)
    const backdropRule = 'Landscape and atmosphere only — no doorway, arch, gate, portal, or keyhole anywhere in the backdrop, and no human or humanoid figures. Any doorway in this world lives only in its own separate cast element, never painted into the backdrop.'
    const [backdropImage, ...elementImages] = await Promise.all([
      backdrop
        ? generateOne(
            `${backdrop}. A full-frame environmental composition with readable depth and enough open space that foreground subjects can contrast clearly against it. Avoid making the backdrop so busy or same-valued that floating subjects disappear. ${backdropRule} ${imageConstraints} LOOK: ${look}`,
            { size: '1536x1024', transparent: false },
          )
        : Promise.resolve(null),
      ...cappedElements.map((element) =>
        generateOne(
          `${elementPrompt(element.description, element.sprite)} ${imageConstraints} LOOK: ${look}`,
          { size: '1024x1024', transparent: true },
        ),
      ),
    ])

    return {
      status: 200,
      body: {
        backdrop: backdropImage,
        elements: [
          ...elementImages,
          ...Array(Math.max(elements.length - cappedElements.length, 0)).fill(null),
        ],
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}
