type AudioContextConstructor = typeof AudioContext

let audioContext: AudioContext | null = null
let soundEnabled = false
let worldSoundCleanup: (() => void) | null = null

export function setJoySoundsEnabled(enabled: boolean) {
  soundEnabled = enabled
}

export function stopJoySounds() {
  soundEnabled = false
  stopWorldSoundscape()
  if (audioContext?.state !== 'closed') {
    void audioContext?.close().catch(() => undefined)
  }
  audioContext = null
}

export function stopWorldSoundscape() {
  worldSoundCleanup?.()
  worldSoundCleanup = null
}

function soundProfile(soundMood: string) {
  const mood = soundMood.toLowerCase()
  if (/sea|wave|tide|water|harbour|ocean/.test(mood)) {
    return { root: 146.83, noiseFrequency: 420, noiseQ: 0.6, swell: 7.2, plinkEveryMs: 4200 }
  }
  if (/forest|leaf|bird|wind|garden|bloom/.test(mood)) {
    return { root: 261.63, noiseFrequency: 900, noiseQ: 1.1, swell: 5.4, plinkEveryMs: 3200 }
  }
  if (/star|space|moon|cosmic|glow|bell/.test(mood)) {
    return { root: 293.66, noiseFrequency: 1400, noiseQ: 2.4, swell: 8.5, plinkEveryMs: 2600 }
  }
  if (/rainbow|bright|sun|laugh|warm/.test(mood)) {
    return { root: 329.63, noiseFrequency: 1100, noiseQ: 1.4, swell: 4.4, plinkEveryMs: 2300 }
  }
  return { root: 196, noiseFrequency: 700, noiseQ: 0.9, swell: 6.2, plinkEveryMs: 3600 }
}

// Pentatonic offsets keep every wandering plink consonant with the world's root.
const pentatonic = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2]

export function startWorldSoundscape(soundMood: string) {
  if (!soundEnabled) return
  const context = getAudioContext()
  if (!context) return

  stopWorldSoundscape()
  void context.resume().catch(() => undefined)
  const profile = soundProfile(soundMood)

  const master = context.createGain()
  master.gain.value = 0.05
  master.connect(context.destination)

  // A soft filtered-noise bed: surf, wind, or starlight hiss depending on mood.
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
  const channel = noiseBuffer.getChannelData(0)
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1
  }
  const noise = context.createBufferSource()
  noise.buffer = noiseBuffer
  noise.loop = true
  const noiseFilter = context.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = profile.noiseFrequency
  noiseFilter.Q.value = profile.noiseQ
  const noiseGain = context.createGain()
  noiseGain.gain.value = 0.28
  const swell = context.createOscillator()
  const swellGain = context.createGain()
  swell.frequency.value = 1 / profile.swell
  swellGain.gain.value = 0.14
  swell.connect(swellGain)
  swellGain.connect(noiseGain.gain)
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(master)
  noise.start()
  swell.start()

  // A warm low anchor tone underneath the bed.
  const anchor = context.createOscillator()
  const anchorGain = context.createGain()
  anchor.type = 'sine'
  anchor.frequency.value = profile.root / 2
  anchorGain.gain.value = 0.16
  anchor.connect(anchorGain)
  anchorGain.connect(master)
  anchor.start()

  // Occasional music-box plinks wandering a pentatonic scale.
  const playPlink = () => {
    const now = context.currentTime + 0.02
    const step = pentatonic[Math.floor(Math.random() * pentatonic.length)]
    const frequency = profile.root * step * (Math.random() < 0.3 ? 2 : 1)
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6)
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(now)
    oscillator.stop(now + 1.7)
  }
  const plinkTimer = setInterval(() => {
    if (Math.random() < 0.75) playPlink()
  }, profile.plinkEveryMs)

  worldSoundCleanup = () => {
    clearInterval(plinkTimer)
    noise.stop()
    swell.stop()
    anchor.stop()
    master.disconnect()
  }
}

export function playHiddenWonderSound() {
  playNotes([783.99, 1046.5, 1318.51, 1567.98], 0.7)
}

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  if (!AudioContextClass) return null
  audioContext ??= new AudioContextClass()
  return audioContext
}

function playNotes(notes: number[], duration: number) {
  if (!soundEnabled) return
  const context = getAudioContext()
  if (!context) return

  void context.resume().catch(() => undefined)
  const start = context.currentTime + 0.02

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const noteStart = start + index * 0.11
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, noteStart)
    gain.gain.setValueAtTime(0.0001, noteStart)
    gain.gain.exponentialRampToValueAtTime(0.045, noteStart + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(noteStart)
    oscillator.stop(noteStart + duration + 0.03)
  })
}

export function playPortalChime() {
  playNotes([523.25, 659.25, 783.99], 0.62)
}

export function playDiscoveryChime() {
  playNotes([659.25, 783.99, 987.77], 0.5)
}

export function playConnectionChime() {
  playNotes([392, 523.25, 659.25, 783.99], 0.78)
}
