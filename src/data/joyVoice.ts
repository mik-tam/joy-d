// Soft storyteller voice for JOY:D world readings. Uses the browser's built-in
// Speech Synthesis API and prefers the most natural English voice available on
// the device — never sends text to a remote TTS service.

type SpeakHandlers = {
  onDone?: () => void
  onError?: () => void
}

let voicesReady = false

function scoreVoice(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  if (!lang.startsWith('en')) return -1000

  let score = 0
  if (/^en(-|_)(us|gb|au|ie|nz|za)/.test(lang) || lang === 'en') score += 12
  if (/natural|neural|enhanced|premium|online|superstar|wavenet/.test(name)) score += 45
  if (
    /samantha|karen|moira|fiona|serena|aria|jenny|sara|salli|joanna|emma|zoe|nicky|tessa|victoria|martha|allison|ava|susan|google uk english female|google us english/.test(
      name,
    )
  ) {
    score += 35
  }
  if (/female|woman/.test(name)) score += 18
  if (voice.localService) score += 6
  if (/compact|eloquence|whisper|novelty|bad news|good news|pipes|trinoids|boing|zarvox|cellos|albert|bahh|bells|bubbles|junior|kathy|princess|ralph|bruce|fred|daniel|david|mark|tom|aaron|gordon|rishi/.test(name)) {
    score -= 55
  }
  if (/\bmale\b/.test(name) && !/female/.test(name)) score -= 18
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

function softScript(worldName: string, story: string, quote: string) {
  // Short breaths between sections keep the reading from sounding like one
  // unbroken machine dump.
  return [
    worldName.trim().replace(/[.!?]+$/, ''),
    story.trim(),
    quote.trim().replace(/^["“]|["”]$/g, ''),
  ].filter(Boolean)
}

export function stopJoyVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
}

export function speakJoyWorld(
  capsule: { worldName: string; story: string; quote: string },
  { onDone, onError }: SpeakHandlers = {},
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.()
    return
  }

  const synth = window.speechSynthesis
  synth.cancel()
  warmJoyVoices()

  const voice = pickSoftVoice()
  const chunks = softScript(capsule.worldName, capsule.story, capsule.quote)
  if (!chunks.length) {
    onDone?.()
    return
  }

  let index = 0
  let cancelled = false

  const finishError = () => {
    if (cancelled) return
    cancelled = true
    onError?.()
  }

  const speakNext = () => {
    if (cancelled) return
    if (index >= chunks.length) {
      onDone?.()
      return
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index])
    index += 1
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = 'en-US'
    }
    // Slower, warmer storytelling cadence — not the default mechanical clip.
    utterance.rate = 0.82
    utterance.pitch = 1.02
    utterance.volume = 1
    utterance.onend = () => {
      if (cancelled) return
      // A short pause between title, story, and quote feels more human.
      window.setTimeout(speakNext, index >= chunks.length ? 0 : 320)
    }
    utterance.onerror = finishError
    synth.speak(utterance)
  }

  // Safari/Chrome can return an empty voice list on the first paint; wait once
  // for voices if needed, then begin.
  if (!voicesReady && synth.getVoices().length === 0) {
    const startWhenReady = () => {
      voicesReady = true
      speakNext()
    }
    synth.addEventListener('voiceschanged', startWhenReady, { once: true })
    window.setTimeout(() => {
      if (!cancelled && synth.getVoices().length > 0) startWhenReady()
    }, 180)
    return
  }

  speakNext()
}
