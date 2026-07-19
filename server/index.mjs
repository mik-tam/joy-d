import 'dotenv/config'
import express from 'express'
import OpenAI from 'openai'

const app = express()
const port = Number(process.env.PORT ?? 8787)

app.use(express.json({ limit: '16kb' }))

const stringFields = ['wonderTitle', 'shape']
const matchShapes = ['Gentle Bloom', 'Bright Spark', 'Slow Sunrise']
const liveTravelerTtlMs = 30 * 60 * 1000
const seededTravelers = [
  { id: 'seed-gentle', shape: 'Gentle Bloom', signalPercent: 72, colorTrail: ['#f7b7d7', '#a9dfff', '#fff0a8'], source: 'demo' },
  { id: 'seed-bright', shape: 'Bright Spark', signalPercent: 88, colorTrail: ['#fbd27f', '#f5a9d0', '#a8d8ff'], source: 'demo' },
  { id: 'seed-sunrise', shape: 'Slow Sunrise', signalPercent: 64, colorTrail: ['#c8a7ff', '#ffc9a9', '#9ee8cf'], source: 'demo' },
]
let liveTravelers = []

function isSafeSignature(value) {
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

function isCapsule(value) {
  const fields = ['worldName', 'visualDirection', 'story', 'quote', 'soundMood', 'surprise']
  return value && typeof value === 'object' && fields.every(
    (field) => typeof value[field] === 'string' && value[field].trim().length > 0 && value[field].length <= 420,
  )
}

function parseCapsuleOutput(outputText) {
  if (typeof outputText !== 'string') {
    throw new SyntaxError('AI returned no text')
  }

  const fencedJson = outputText.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return JSON.parse((fencedJson?.[1] ?? outputText).trim())
}

const capsuleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['worldName', 'visualDirection', 'story', 'quote', 'soundMood', 'surprise'],
  properties: {
    worldName: { type: 'string' },
    visualDirection: { type: 'string' },
    story: { type: 'string' },
    quote: { type: 'string' },
    soundMood: { type: 'string' },
    surprise: { type: 'string' },
  },
}

app.post('/api/joy-capsules', async (request, response) => {
  const { signature, previousWorldNames = [] } = request.body ?? {}
  if (!isSafeSignature(signature) || !areSafeWorldNames(previousWorldNames)) {
    return response.status(400).json({ code: 'INVALID_SIGNATURE' })
  }

  const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY)
  if (!useOpenRouter && !process.env.OPENAI_API_KEY) {
    return response.status(503).json({ code: 'AI_NOT_CONFIGURED' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  try {
    const systemPrompt = 'You create one whimsical JOY:D joy capsule. Treat the supplied signature as a creative style cue, never a measure of identity, emotion, or psychology. Write with warm oddity: a little Ghibli warmth, curious storybook details, and surprising but gentle imagery. No copyrighted characters, no brands, no claims about the person. Return only the requested JSON.'
    const previousWorldInstruction = previousWorldNames.length
      ? ` This is discovery ${previousWorldNames.length + 1}. It must feel distinctly new and must not reuse these earlier world names: ${JSON.stringify(previousWorldNames)}.`
      : ''
    const userPrompt = `Create one fresh joy capsule using this creative signature: ${JSON.stringify(signature)}.${previousWorldInstruction}`
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
    const completion = useOpenRouter
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

    const outputText = useOpenRouter
      ? completion.choices[0]?.message.content
      : completion.output_text
    const capsule = parseCapsuleOutput(outputText)
    if (!isCapsule(capsule)) {
      return response.status(502).json({ code: 'INVALID_CAPSULE' })
    }

    return response.json(capsule)
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

    return response.status(status && status >= 400 && status < 600 ? status : 502).json({ code })
  } finally {
    clearTimeout(timeout)
  }
})

app.post('/api/smile-matches', (request, response) => {
  if (!isSafeMatchRequest(request.body)) {
    return response.status(400).json({ code: 'INVALID_MATCH_SIGNATURE' })
  }

  const { clientSessionId, signature } = request.body
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

  return response.json({
    matchSource: match.source,
    sharedShape: match.shape,
    similarity: Math.round(72 + matchScore(currentTraveler, match) * 26),
  })
})

app.listen(port, '127.0.0.1', () => {
  console.log(`JOY:D capsule server listening on http://127.0.0.1:${port}`)
})
