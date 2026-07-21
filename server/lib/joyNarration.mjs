import OpenAI from 'openai'

// No Express-specific code here — shared by server/index.mjs (local dev and
// the Express production host) and api/joy-narration.js (Vercel). Reads only
// the AI-generated story text the client already has (title, story, quote) —
// never camera frames, face data, or anything typed by the user.

function isSafeNarrationRequest(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof value.text === 'string'
    && value.text.trim().length > 0
    && value.text.length <= 1400,
  )
}

// Returns { status, body } — never throws — so both the Express route and
// the Vercel function can respond identically.
export async function handleJoyNarrationRequest(requestBody) {
  if (!isSafeNarrationRequest(requestBody)) {
    return { status: 400, body: { code: 'INVALID_NARRATION_REQUEST' } }
  }
  if (!process.env.OPENAI_API_KEY) {
    return { status: 503, body: { code: 'NARRATION_UNAVAILABLE' } }
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const speech = await client.audio.speech.create({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: process.env.OPENAI_TTS_VOICE || 'shimmer',
      input: requestBody.text,
      instructions: 'Speak softly and warmly, like a gentle bedtime storyteller reading aloud to someone they love. Slow, calm, tender pacing, with a natural unhurried breath between sentences and a small dramatic pause before any closing quote.',
      response_format: 'mp3',
    }, { signal: controller.signal })

    const buffer = Buffer.from(await speech.arrayBuffer())
    return {
      status: 200,
      body: { audio: `data:audio/mpeg;base64,${buffer.toString('base64')}` },
    }
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : undefined
    console.error('JOY:D narration request failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error?.name,
      status,
    })
    const code = error?.name === 'AbortError' ? 'NARRATION_TIMEOUT' : 'NARRATION_UNAVAILABLE'
    return { status: status && status >= 400 && status < 600 ? status : 502, body: { code } }
  } finally {
    clearTimeout(timeout)
  }
}
