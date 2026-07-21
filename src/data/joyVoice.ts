// Soft storyteller voice for JOY:D world readings. Primary path is a neural
// text-to-speech reading fetched from the server (only the AI-generated
// story text is sent — never camera frames or face data, same rule as image
// generation). If that's unavailable, this falls back to the browser's
// built-in Speech Synthesis API so a reading is always possible.

type SpeakHandlers = {
  onDone?: () => void
  onError?: () => void
}

type NarrationCapsule = { worldName: string; story: string; quote: string }

let voicesReady = false
let currentAudio: HTMLAudioElement | null = null
let currentToken = 0
const audioCache = new Map<string, string>()

function isAppleTouchDevice() {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

function scoreVoice(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  if (!lang.startsWith('en')) return -1000

  let score = 0
  if (/^en(-|_)(us|gb|au|ie|nz|za)/.test(lang) || lang === 'en') score += 12
  if (/natural|neural|enhanced|premium|online|superstar|wavenet|quality/.test(name)) score += 55
  if (
    /samantha|karen|moira|fiona|serena|aria|jenny|sara|salli|joanna|emma|zoe|nicky|tessa|victoria|martha|allison|ava|susan|google uk english female|google us english|microsoft (aria|jenny|sonia|natasha|zira)/.test(
      name,
    )
  ) {
    score += 40
  }
  // iOS often defaults to a harsh compact voice; heavily prefer named soft
  // storytellers and Enhanced/Premium downloads when present.
  if (isAppleTouchDevice()) {
    if (/samantha|karen|moira|fiona|serena|nicky|tessa|martha|catherine|melina/.test(name)) score += 50
    if (/enhanced|premium|siri/.test(name)) score += 60
    if (/compact/.test(name)) score -= 80
    // On iPhone, non-local "enhanced" network voices can sound much softer.
    if (!voice.localService) score += 28
  }
  if (isAndroidDevice()) {
    if (/google uk english female|google us english|en-gb|en-au/.test(name + lang)) score += 40
    if (/network|neural/.test(name)) score += 30
  }
  if (/female|woman/.test(name)) score += 18
  if (voice.localService) score += 4
  if (
    /compact|eloquence|whisper|novelty|bad news|good news|pipes|trinoids|boing|zarvox|cellos|albert|bahh|bells|bubbles|junior|kathy|princess|ralph|bruce|fred|daniel|david|mark|tom|aaron|gordon|rishi|robot|reed|organ|bell/.test(
      name,
    )
  ) {
    score -= 70
  }
  if (/\bmale\b/.test(name) && !/female/.test(name)) score -= 22
  return score
}

export function warmJoyVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const synth = window.speechSynthesis
  const markReady = () => {
    voicesReady = synth.getVoices().length > 0
  }
  markReady()
  if (!voicesReady) {
    synth.addEventListener('voiceschanged', markReady, { once: true })
  }
  // Some browsers only populate voices after a quiet getVoices() call.
  void synth.getVoices()
}

function pickSoftVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null
}

function narrationScript(worldName: string, story: string, quote: string) {
  const title = worldName.trim().replace(/[.!?]+$/, '')
  const quoteText = quote.trim().replace(/^["“]|["”]$/g, '')
  const storyText = story.trim()
  const parts = [title ? `${title}.` : '', storyText, quoteText ? `“${quoteText}”` : ''].filter(Boolean)
  return parts.join(' ')
}

function softScript(worldName: string, story: string, quote: string) {
  // One sentence per utterance: a long single utterance reads flat and
  // mechanical on the browser's own voices, but short breaths between
  // sentences (with a pause between them, see speakNext) give the fallback
  // reading a storyteller's cadence instead of one unbroken machine dump.
  const title = worldName.trim().replace(/[.!?]+$/, '')
  const quoteText = quote.trim().replace(/^["“]|["”]$/g, '')
  const storyText = story.trim()
  const chunks = [title]

  const sentences = storyText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [storyText]
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (trimmed) chunks.push(trimmed)
  }

  if (quoteText) chunks.push(quoteText)
  return chunks.filter(Boolean)
}

export function stopJoyVoice() {
  currentToken += 1
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

// The browser's own Speech Synthesis API — used only when the neural
// narration fetch below is unavailable (offline, no OpenAI key, request
// failed). Lower quality, but keeps a reading possible either way.
function speakWithBrowserVoice(capsule: NarrationCapsule, token: number, { onDone, onError }: SpeakHandlers) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.()
    return
  }

  const synth = window.speechSynthesis
  synth.cancel()
  warmJoyVoices()

  const chunks = softScript(capsule.worldName, capsule.story, capsule.quote)
  if (!chunks.length) {
    onDone?.()
    return
  }
  const hasQuote = Boolean(capsule.quote.trim().replace(/^["“]|["”]$/g, ''))

  let index = 0
  const mobile = isAppleTouchDevice() || isAndroidDevice()

  const cancelled = () => token !== currentToken

  const finishError = () => {
    if (cancelled()) return
    onError?.()
  }

  const speakNext = () => {
    if (cancelled()) return
    if (index >= chunks.length) {
      onDone?.()
      return
    }

    const chunkIndex = index
    const isTitle = chunkIndex === 0
    // Re-pick on every chunk — iOS often finishes loading Enhanced voices
    // mid-reading after the user gesture that started playback.
    const voice = pickSoftVoice()
    const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex])
    index += 1
    const nextIsQuote = hasQuote && index === chunks.length - 1
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = mobile ? 'en-GB' : 'en-US'
    }
    // Slower, warmer storytelling cadence — slightly softer still on phones.
    // A small per-sentence jitter keeps a multi-sentence story from sounding
    // like a metronome; a real storyteller never hits the exact same beat
    // twice in a row.
    const jitter = (Math.random() - 0.5) * 0.05
    utterance.rate = (mobile ? 0.78 : 0.82) + jitter
    utterance.pitch = (mobile ? 1.06 : 1.02) + jitter * 0.6
    utterance.volume = 1
    utterance.onend = () => {
      if (cancelled()) return
      const pause =
        index >= chunks.length
          ? 0
          : isTitle
            ? (mobile ? 520 : 420) // a breath before the story begins
            : nextIsQuote
              ? (mobile ? 560 : 460) // a small dramatic beat before the closing quote
              : (mobile ? 420 : 320)
      window.setTimeout(speakNext, pause)
    }
    utterance.onerror = finishError
    synth.speak(utterance)

    // iOS Safari sometimes stalls the queue unless it is briefly nudged.
    if (mobile && synth.paused) synth.resume()
  }

  const begin = () => {
    voicesReady = true
    // Tiny delay lets iOS attach the chosen voice after cancel().
    window.setTimeout(speakNext, mobile ? 60 : 0)
  }

  // Safari/Chrome can return an empty voice list on the first paint; wait once
  // for voices if needed, then begin.
  if (!voicesReady && synth.getVoices().length === 0) {
    synth.addEventListener('voiceschanged', begin, { once: true })
    window.setTimeout(() => {
      if (!cancelled() && synth.getVoices().length > 0) begin()
    }, 220)
    return
  }

  begin()
}

async function fetchNarrationAudio(capsule: NarrationCapsule): Promise<string | null> {
  const cached = audioCache.get(capsule.worldName)
  if (cached) return cached

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch('/api/joy-narration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: narrationScript(capsule.worldName, capsule.story, capsule.quote) }),
      signal: controller.signal,
    })
    if (!response.ok) return null
    const result: unknown = await response.json()
    const audio = (result as { audio?: unknown })?.audio
    if (typeof audio !== 'string' || !audio) return null
    audioCache.set(capsule.worldName, audio)
    return audio
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}

export function speakJoyWorld(capsule: NarrationCapsule, handlers: SpeakHandlers = {}) {
  stopJoyVoice()
  const token = currentToken
  const { onDone, onError } = handlers

  void fetchNarrationAudio(capsule).then((audioUrl) => {
    if (token !== currentToken) return
    if (!audioUrl) {
      speakWithBrowserVoice(capsule, token, handlers)
      return
    }
    const audio = new Audio(audioUrl)
    currentAudio = audio
    audio.onended = () => {
      if (token !== currentToken) return
      currentAudio = null
      onDone?.()
    }
    audio.onerror = () => {
      if (token !== currentToken) return
      currentAudio = null
      // The fetch succeeded but playback itself failed — still fall back
      // rather than leaving the traveler with a silently broken button.
      speakWithBrowserVoice(capsule, token, { onDone, onError })
    }
    void audio.play().catch(() => {
      if (token !== currentToken) return
      currentAudio = null
      speakWithBrowserVoice(capsule, token, { onDone, onError })
    })
  })
}
