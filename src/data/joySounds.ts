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
  if (/sea|wave|tide|water|harbour|ocean/.test(mood)) return { notes: [146.83, 220, 293.66], type: 'sine' as OscillatorType, pulse: 6.8 }
  if (/forest|leaf|bird|wind|garden|bloom/.test(mood)) return { notes: [261.63, 329.63, 392], type: 'triangle' as OscillatorType, pulse: 4.8 }
  if (/star|space|moon|cosmic|glow|bell/.test(mood)) return { notes: [293.66, 440, 659.25], type: 'sine' as OscillatorType, pulse: 3.7 }
  if (/rainbow|bright|sun|laugh|warm/.test(mood)) return { notes: [329.63, 493.88, 659.25], type: 'triangle' as OscillatorType, pulse: 3.2 }
  return { notes: [196, 293.66, 392], type: 'sine' as OscillatorType, pulse: 5.4 }
}

export function startWorldSoundscape(soundMood: string) {
  if (!soundEnabled) return
  const context = getAudioContext()
  if (!context) return

  stopWorldSoundscape()
  void context.resume().catch(() => undefined)
  const profile = soundProfile(soundMood)
  const master = context.createGain()
  master.gain.value = 0.026
  master.connect(context.destination)
  const oscillators = profile.notes.map((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = index === 1 ? 'sine' : profile.type
    oscillator.frequency.value = frequency / (index === 0 ? 2 : 1)
    gain.gain.value = index === 2 ? 0.2 : 0.34
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start()
    return oscillator
  })
  const tremolo = context.createOscillator()
  const tremoloGain = context.createGain()
  tremolo.frequency.value = 1 / profile.pulse
  tremoloGain.gain.value = 0.018
  tremolo.connect(tremoloGain)
  tremoloGain.connect(master.gain)
  tremolo.start()

  worldSoundCleanup = () => {
    oscillators.forEach((oscillator) => oscillator.stop())
    tremolo.stop()
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
