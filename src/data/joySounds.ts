type AudioContextConstructor = typeof AudioContext

let audioContext: AudioContext | null = null
let soundEnabled = false

export function setJoySoundsEnabled(enabled: boolean) {
  soundEnabled = enabled
}

export function stopJoySounds() {
  soundEnabled = false
  if (audioContext?.state !== 'closed') {
    void audioContext?.close().catch(() => undefined)
  }
  audioContext = null
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
